#!/bin/bash

# Fix imports in the SEO/LLM system to match TaxGeniusPro structure

echo "Fixing import paths in SEO/LLM system..."

# Navigate to the seo-llm directory
cd /root/websites/taxgeniuspro/src/lib/seo-llm

# Fix common import patterns
# Note: Using sed with -i for in-place editing

echo "1. Fixing Prisma imports..."
find . -type f -name "*.ts" -exec sed -i "s|from '@/lib/prisma'|from '@/lib/prisma'|g" {} \;
find . -type f -name "*.ts" -exec sed -i "s|from '@/lib/db'|from '@/lib/prisma'|g" {} \;

echo "2. Fixing internal SEO/LLM imports..."
# Update imports that reference other parts of the SEO system
find . -type f -name "*.ts" -exec sed -i "s|from '@/seo-llm/|from '@/lib/seo-llm/|g" {} \;

echo "3. Fixing Redis imports..."
# TaxGeniusPro might have redis in a different location
find . -type f -name "*.ts" -exec sed -i "s|from '@/lib/redis'|from 'ioredis'|g" {} \;

echo "4. Fixing config imports..."
find . -type f -name "*.ts" -exec sed -i "s|from '@/config/|from '@/lib/|g" {} \;

echo "5. Fixing image generation imports..."
# Update any image generation service imports
find . -type f -name "*.ts" -exec sed -i "s|from '@/lib/image-generation'|from '@/lib/seo-llm/2-llm-integrations/google-imagen/google-ai-client'|g" {} \;

echo "Import fixes completed!"

# Show summary of TypeScript files
echo ""
echo "Summary:"
echo "Total TypeScript files: $(find . -name '*.ts' | wc -l)"
echo ""
echo "Files by directory:"
find . -name '*.ts' | xargs dirname | sort | uniq -c | sort -rn

echo ""
echo "Next steps:"
echo "1. Review import errors with: cd /root/websites/taxgeniuspro && npx tsc --noEmit"
echo "2. Fix any remaining import issues manually"
echo "3. Test the integration"
