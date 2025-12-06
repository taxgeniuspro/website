#!/bin/bash
# TaxGeniusPro - Deploy to VPS Script
# Syncs local -> GitHub -> VPS

set -e

VPS_HOST="root@72.60.28.175"
VPS_PATH="/root/websites/taxgeniuspro"
VPS_PASS="Bobby321&Gloria321Watkins?"

echo "=== TaxGeniusPro Deployment ==="
echo ""

# Step 1: Check for uncommitted changes
echo "[1/5] Checking local git status..."
if [[ -n $(git status --porcelain) ]]; then
    echo "You have uncommitted changes. Commit them first!"
    git status --short
    exit 1
fi

# Step 2: Push to GitHub
echo "[2/5] Pushing to GitHub..."
git push origin main

# Step 3: Pull on VPS
echo "[3/5] Pulling latest on VPS..."
sshpass -p "$VPS_PASS" ssh $VPS_HOST "cd $VPS_PATH && git pull origin main"

# Step 4: Rebuild Docker containers
echo "[4/5] Rebuilding Docker containers on VPS..."
sshpass -p "$VPS_PASS" ssh $VPS_HOST "cd $VPS_PATH && docker compose build app --no-cache"

# Step 5: Restart services
echo "[5/5] Restarting services..."
sshpass -p "$VPS_PASS" ssh $VPS_HOST "cd $VPS_PATH && docker compose up -d"

echo ""
echo "=== Deployment Complete ==="
echo "Site: https://taxgeniuspro.tax"
echo "Port: 3005"
