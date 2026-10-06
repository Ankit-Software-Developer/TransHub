#!/usr/bin/env bash
set -e

APP_DIR="/home/transhub"
REPO_URL="https://github.com/Ankit-Software-Developer/TransHub.git"
BRANCH="main"

echo "=========================================="
echo "🚀 Starting TransHub PM2 Deployment"
echo "=========================================="

# Ensure directory exists or clone repository
if [ ! -d "$APP_DIR/.git" ]; then
    echo "📦 Directory not found. Cloning repository..."
    mkdir -p "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
else
    echo "🔄 Pulling latest changes from $BRANCH..."
    cd "$APP_DIR"
    git fetch --all
    git reset --hard origin/$BRANCH
    git pull origin $BRANCH
fi

# Ensure .env exists in backend
if [ ! -f "$APP_DIR/backend/.env" ]; then
    if [ -f "$APP_DIR/backend/.env.example" ]; then
        echo "⚠️  backend/.env not found, copying from .env.example..."
        cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
    fi
fi

# 1. Setup Backend
echo "📦 Installing backend dependencies..."
cd "$APP_DIR/backend"
npm install --omit=dev

# 2. Setup Frontend
echo "📦 Installing frontend dependencies & building..."
cd "$APP_DIR/frontend"
npm install
npm run build

# 3. Reload PM2 services
echo "⚡ Starting / Reloading PM2 processes..."
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
