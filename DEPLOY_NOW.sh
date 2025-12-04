#!/bin/bash

# Content Restrictions Deployment Script
# Run this on your production server: 72.60.28.175

echo "🚀 Deploying Content Restrictions to Production..."
echo ""

# Navigate to project directory
cd /root/websites/taxgeniuspro || exit 1

echo "📦 Pulling latest code from GitHub..."
git pull origin main

echo ""
echo "📥 Installing dependencies..."
npm install

echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo ""
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo ""
echo "🔄 Restarting application..."
# Adjust this command based on your process manager
pm2 restart taxgeniuspro || npm run start

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Access the admin page at:"
echo "   https://taxgeniuspro.tax/admin/content-restrictions"
echo ""
