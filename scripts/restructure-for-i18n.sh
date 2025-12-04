#!/bin/bash

# Script to restructure Next.js App Router for i18n with next-intl
# Moves all pages from /src/app/* to /src/app/[locale]/*

set -e  # Exit on error

echo "================================================"
echo "  Restructuring App Directory for i18n"
echo "================================================"

cd /root/websites/taxgeniuspro

# Create backup
echo "Creating backup..."
BACKUP_DIR="/tmp/taxgeniuspro-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r src/app "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"

# Create [locale] directory
echo "Creating [locale] directory..."
mkdir -p src/app/\[locale\]

# Function to move directory
move_to_locale() {
    local dir_name=$1
    if [ -d "src/app/$dir_name" ]; then
        echo "Moving /$dir_name..."
        mv "src/app/$dir_name" "src/app/[locale]/"
    fi
}

# Function to move file
move_file_to_locale() {
    local file_name=$1
    if [ -f "src/app/$file_name" ]; then
        echo "Moving /$file_name..."
        mv "src/app/$file_name" "src/app/[locale]/"
    fi
}

# Move all route directories (excluding api, special Next.js files, and [locale])
echo ""
echo "Moving route directories..."

# List of directories to move
DIRECTORIES=(
    "about"
    "accessibility"
    "admin"
    "affiliate"
    "app"
    "apply"
    "auth"
    "blog"
    "book"
    "book-appointment"
    "calculator"
    "clear-session"
    "contact"
    "crm"
    "dashboard"
    "debug-role"
    "find-a-refund"
    "forbidden"
    "guide"
    "help"
    "home-preview"
    "join-team"
    "locations"
    "preparer"
    "privacy"
    "refer"
    "referral"
    "refund-advance"
    "security"
    "services"
    "setup-admin"
    "shared-forms"
    "start-filing"
    "store"
    "support"
    "tax-calculator"
    "tax-guide"
    "terms"
    "testimonials"
    "training"
    "upload"
    "wordpress-landing"
)

for dir in "${DIRECTORIES[@]}"; do
    move_to_locale "$dir"
done

# Move root level page files
echo ""
echo "Moving root-level page files..."
move_file_to_locale "page.tsx"
move_file_to_locale "loading.tsx"
move_file_to_locale "error.tsx"
move_file_to_locale "not-found.tsx"

echo ""
echo "================================================"
echo "  Restructuring Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Update root layout.tsx to accept locale parameter"
echo "2. Test the application"
echo "3. If issues occur, restore from: $BACKUP_DIR"
echo ""
