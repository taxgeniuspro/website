#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '../src/app/api');

function findRouteFiles(dir) {
  const files = [];
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item === 'route.ts' || item === 'route.tsx') {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Skip if doesn't have params
  if (!content.includes('{ params }')) {
    return false;
  }

  // Pattern 1: Multi-line function signature
  // { params }: { params: { id: string } } -> { params }: { params: Promise<{ id: string }> }
  content = content.replace(
    /\{\s*params\s*\}:\s*\{\s*params:\s*\{([^}]+)\}\s*\}/g,
    (match, paramContent) => {
      // Skip if already has Promise
      if (match.includes('Promise<')) return match;
      return `{ params }: { params: Promise<{${paramContent}}> }`;
    }
  );

  // Pattern 2: Inline function signature (same pattern, already covered above)

  // Pattern 3: const { x } = params; -> const { x } = await params;
  // But only if not already awaited
  content = content.replace(
    /const\s*(\{[^}]+\})\s*=\s*params\s*;/g,
    (match, destructure) => {
      // Check if the line before has 'await params'
      return `const ${destructure} = await params;`;
    }
  );

  // Pattern 4: params.id or params.userId etc -> need manual fix
  // (too complex for regex, will handle separately)

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  return false;
}

const files = findRouteFiles(API_DIR);
console.log(`Found ${files.length} route files`);

let fixed = 0;
for (const file of files) {
  if (fixFile(file)) {
    fixed++;
  }
}

console.log(`\nFixed ${fixed} files`);
