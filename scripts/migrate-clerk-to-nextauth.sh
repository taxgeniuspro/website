#!/bin/bash

#####################################################
# Clerk to NextAuth Migration Script
# Automatically replaces common Clerk patterns with NextAuth equivalents
#####################################################

set -e

echo "🔄 Starting Clerk to NextAuth migration..."
echo "=================================="

# Count files before migration
BEFORE_COUNT=$(grep -r "@clerk" /root/websites/taxgeniuspro/src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l 2>/dev/null | wc -l)
echo "📊 Files with Clerk references: $BEFORE_COUNT"

# 1. Replace clerk/nextjs imports with next-auth imports (server-side)
echo ""
echo "Step 1: Replacing server-side imports..."
find /root/websites/taxgeniuspro/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i \
  -e "s/import { auth, currentUser } from '@clerk\/nextjs\/server'/import { auth } from '@\/lib\/auth'/g" \
  -e "s/import { auth } from '@clerk\/nextjs\/server'/import { auth } from '@\/lib\/auth'/g" \
  -e "s/import { currentUser } from '@clerk\/nextjs\/server'/import { auth } from '@\/lib\/auth'/g" \
  -e "s/import { clerkClient } from '@clerk\/nextjs\/server'/\/\/ Clerk client removed - using NextAuth/g" \
  {} \;

# 2. Replace client-side Clerk imports
echo "Step 2: Replacing client-side imports..."
find /root/websites/taxgeniuspro/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i \
  -e "s/import { useUser } from '@clerk\/nextjs'/import { useSession } from 'next-auth\/react'/g" \
  -e "s/import { SignIn } from '@clerk\/nextjs'/\/\/ Using custom signin page/g" \
  -e "s/import { SignUp } from '@clerk\/nextjs'/\/\/ Using custom signup page/g" \
  -e "s/import { ClerkProvider } from '@clerk\/nextjs'/\/\/ Using NextAuth SessionProvider/g" \
  {} \;

# 3. Replace useUser() with useSession()
echo "Step 3: Replacing useUser hook..."
find /root/websites/taxgeniuspro/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i \
  -e "s/const { user, isLoaded } = useUser()/const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading'/g" \
  -e "s/const { user } = useUser()/const { data: session } = useSession(); const user = session?.user/g" \
  {} \;

# 4. Replace currentUser() with auth() pattern
echo "Step 4: Replacing currentUser calls..."
find /root/websites/taxgeniuspro/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i \
  -e "s/const user = await currentUser()/const session = await auth(); const user = session?.user/g" \
  -e "s/await currentUser()/await auth()/g" \
  {} \;

# 5. Replace role access patterns
echo "Step 5: Replacing role access patterns..."
find /root/websites/taxgeniuspro/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i \
  -e "s/user\.publicMetadata\.role/user.role/g" \
  -e "s/user\.publicMetadata/user/g" \
  {} \;

# 6. Remove clerkClient calls (these need manual review)
echo "Step 6: Commenting out clerkClient calls (needs manual review)..."
find /root/websites/taxgeniuspro/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i \
  -e "s/await clerkClient()/\/\/ TODO: Replace with prisma query/g" \
  -e "s/clerkClient\./\/\/ TODO: clerkClient./g" \
  {} \;

# 7. Replace auth check patterns
echo "Step 7: Replacing auth check patterns..."
find /root/websites/taxgeniuspro/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i \
  -e "s/const { userId } = await auth()/const session = await auth(); const userId = session?.user?.id/g" \
  {} \;

# 8. Remove ClerkProvider and replace with SessionProvider
echo "Step 8: Updating provider patterns..."
find /root/websites/taxgeniuspro/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i \
  -e "s/<ClerkProvider>/<SessionProvider>/g" \
  -e "s/<\/ClerkProvider>/<\/SessionProvider>/g" \
  {} \;

# Count files after migration
AFTER_COUNT=$(grep -r "@clerk" /root/websites/taxgeniuspro/src --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l 2>/dev/null | wc -l || echo "0")

echo ""
echo "=================================="
echo "✅ Migration complete!"
echo "📊 Files still with Clerk references: $AFTER_COUNT"
echo "📉 Files migrated: $((BEFORE_COUNT - AFTER_COUNT))"
echo ""
echo "⚠️  Note: Some files may need manual review, especially:"
echo "   - Complex clerkClient usage"
echo "   - Custom Clerk components"
echo "   - Webhook handlers"
echo ""
echo "Next steps:"
echo "1. Run 'npm run build' to check for errors"
echo "2. Review files with remaining '@clerk' references"
echo "3. Test authentication flow"
