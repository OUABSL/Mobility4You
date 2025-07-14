#!/bin/bash
set -e

echo "🚀 Building Mobility4You Frontend for Render..."

# Install dependencies with legacy peer deps for compatibility
echo "📦 Installing dependencies..."
npm ci --production=false --legacy-peer-deps

# Build the application with production environment
echo "🔨 Building application..."
NODE_ENV=production npm run build

echo "✅ Frontend build completed successfully!"
echo "📁 Build output available in ./build directory"
