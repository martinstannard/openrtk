#!/bin/bash
# One-click deployment script for RTK + OpenRTK
# Installs RTK (Rust Token Killer) and OpenRTK plugin for OpenCode

set -euo pipefail

echo "🚀 Starting RTK + OpenRTK one-click deployment..."

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to print status messages
print_status() {
  echo "✅ $1"
}

# Function to print error messages
print_error() {
  echo "❌ $1" >&2
}

# Function to print info messages
print_info() {
  echo "ℹ️  $1"
}

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"
print_info "Detected OS: $OS, Architecture: $ARCH"

# Step 1: Install RTK (Rust Token Killer)
print_info "Checking RTK installation..."
if command_exists rtk && rtk --version 2>/dev/null | grep -q "rtk"; then
  RTK_VERSION=$(rtk --version)
  print_status "RTK already installed: $RTK_VERSION"
else
  print_info "Installing RTK..."
  
  # Try multiple installation methods
  if command_exists brew; then
    print_info "Installing via Homebrew..."
    brew install rtk || {
      print_error "Homebrew installation failed"
      exit 1
    }
  elif command_exists cargo; then
    print_info "Installing via cargo..."
    cargo install --git https://github.com/rtk-ai/rtk || {
      print_error "Cargo installation failed"
      exit 1
    }
  else
    print_info "Installing via install script..."
    curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh || {
      print_error "Install script failed"
      exit 1
    }
  fi
  
  # Verify installation
  if ! command_exists rtk; then
    print_error "RTK installation failed - rtk command not found"
    exit 1
  fi
  
  RTK_VERSION=$(rtk --version)
  print_status "RTK installed: $RTK_VERSION"
fi

# Step 2: Check if we're in an OpenCode project
print_info "Checking for OpenCode project..."
if [ ! -f ".opencode/config.json" ] && [ ! -f "opencode.json" ]; then
  print_info "No OpenCode config found. Creating basic config..."
  mkdir -p .opencode
  cat > .opencode/config.json << 'EOF'
{
  "plugins": []
}
EOF
  print_status "Created basic OpenCode config"
fi

# Step 3: Install OpenRTK plugin
print_info "Setting up OpenRTK plugin..."
if [ -d "node_modules" ] && [ -f "package.json" ]; then
  print_info "Installing OpenRTK via npm..."
  npm install ./ || {
    print_error "npm install failed"
    exit 1
  }
else
  print_info "Building and installing OpenRTK locally..."
  # Install dependencies if needed
  if command_exists bun; then
    bun install
  elif command_exists npm; then
    npm install
  else
    print_error "Neither bun nor npm found. Please install Node.js dependencies."
    exit 1
  fi
  
  # Build the plugin
  if command_exists bun; then
    bun run build
  elif command_exists npm; then
    npm run build
  fi
  
  print_status "OpenRTK plugin built successfully"
fi

# Step 4: Configure OpenCode to use OpenRTK plugin
print_info "Configuring OpenCode to use OpenRTK plugin..."
CONFIG_FILE=""
if [ -f ".opencode/config.json" ]; then
  CONFIG_FILE=".opencode/config.json"
elif [ -f "opencode.json" ]; then
  CONFIG_FILE="opencode.json"
fi

if [ -n "$CONFIG_FILE" ]; then
  # Check if openrtk is already in plugins
  if ! grep -q '"openrtk"' "$CONFIG_FILE"; then
    # Add openrtk to plugins array
    if grep -q '"plugins"' "$CONFIG_FILE"; then
      # Plugins array exists, add to it
      sed -i '' 's/"plugins": \[/"plugins": ["openrtk", /g' "$CONFIG_FILE" 2>/dev/null || \
      sed -i 's/"plugins": \[/"plugins": ["openrtk", /g' "$CONFIG_FILE"
    else
      # No plugins array, create one
      sed -i '' 's/}/{ \"plugins\": [\"openrtk\"] }/g' "$CONFIG_FILE" 2>/dev/null || \
      sed -i 's/}/{ \"plugins\": [\"openrtk\"] }/g' "$CONFIG_FILE"
    fi
    print_status "Added OpenRTK to OpenCode config"
  else
    print_status "OpenRTK already configured in OpenCode config"
  fi
else
  print_error "Could not find OpenCode config file"
  exit 1
fi

# Step 5: Initialize RTK hook for global command rewriting
print_info "Initializing RTK hook..."
if rtk init --global 2>/dev/null; then
  print_status "RTK hook initialized globally"
else
  print_warning "RTK hook initialization may have failed. You may need to run 'rtk init --global' manually."
fi

# Step 6: Verify installation
print_info "Verifying installation..."
if command_exists rtk && rtk --version >/dev/null 2>&1; then
  print_status "RTK verification passed"
else
  print_error "RTK verification failed"
  exit 1
fi

# Test the rewrite functionality
print_info "Testing OpenRTK plugin..."
if [ -f "src/index.ts" ] && [ -f "src/rewrite.ts" ]; then
  print_status "OpenRTK source files present"
else
  print_warning "OpenRTK source files not found in expected location"
fi

echo ""
echo "🎉 Deployment complete! RTK + OpenRTK are ready to use."
echo ""
echo "📝 Next steps:"
echo "1. Restart your OpenCode/CLI editor to load the plugin"
echo "2. Run 'rtk gain' to see token savings analytics"
echo "3. Use any shell command - it will automatically be optimized via RTK!"
echo ""
echo "💡 Example commands that will be automatically optimized:"
echo "   git status, cargo test, npm test, docker ps, ls -la, etc."
echo ""
echo "📚 For more information:"
echo "   - RTK docs: https://github.com/rtk-ai/rtk"
echo "   - OpenRTK docs: https://github.com/martins/openrtk"