#!/bin/bash
# TaxGeniusPro - Sync FROM VPS Script
# Pulls VPS changes -> GitHub -> local

set -e

VPS_HOST="root@72.60.28.175"
VPS_PATH="/root/websites/taxgeniuspro"
VPS_PASS="Bobby321&Gloria321Watkins?"

echo "=== Syncing FROM VPS ==="
echo ""

# Step 1: Commit and push VPS changes
echo "[1/3] Committing VPS changes..."
sshpass -p "$VPS_PASS" ssh $VPS_HOST "cd $VPS_PATH && git add -A && git diff --cached --quiet || git commit -m 'VPS changes sync'"

echo "[2/3] Pushing VPS to GitHub..."
sshpass -p "$VPS_PASS" ssh $VPS_HOST "cd $VPS_PATH && git push origin main"

# Step 2: Pull locally
echo "[3/3] Pulling to local..."
git pull origin main

echo ""
echo "=== Sync Complete ==="
