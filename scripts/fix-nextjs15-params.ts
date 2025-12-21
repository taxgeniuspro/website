#!/usr/bin/env npx ts-node

/**
 * Script to fix Next.js 15 route handler params
 *
 * Next.js 15 changed route handlers so params is now a Promise.
 * This script updates all route handlers to use async params.
 *
 * Before: { params }: { params: { id: string } }
 * After: { params }: { params: Promise<{ id: string }> }
 *
 * And adds: const { id } = await params;
 */

import * as fs from 'fs';
import * as path from 'path';

const API_DIR = path.join(__dirname, '../src/app/api');

// Regex patterns
const PARAMS_TYPE_PATTERN = /\{\s*params\s*\}:\s*\{\s*params:\s*\{([^}]+)\}\s*\}/g;
const PARAMS_DESTRUCTURE_PATTERN = /const\s*\{([^}]+)\}\s*=\s*params\s*;?/g;

function findRouteFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
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

function fixRouteFile(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Check if file has the old params pattern
  if (!content.includes('{ params }:') && !content.includes('{params}:')) {
    return false;
  }

  // Skip if already fixed (has Promise<)
  if (content.includes('Promise<{') && content.includes('await params')) {
    return false;
  }

  // Fix params type: { params: { id: string } } -> { params: Promise<{ id: string }> }
  content = content.replace(
    /\{\s*params\s*\}:\s*\{\s*params:\s*\{([^}]+)\}\s*\}/g,
    '{ params }: { params: Promise<{$1}> }'
  );

  // Find all function handlers and add await params at the start
  // Pattern: export async function GET/POST/PATCH/DELETE/PUT
  const handlerPattern = /(export\s+async\s+function\s+(?:GET|POST|PATCH|DELETE|PUT)\s*\([^)]*\{\s*params\s*\}[^)]*\)\s*\{)/g;

  content = content.replace(handlerPattern, (match) => {
    return match;
  });

  // Replace direct params usage with await
  // const { id } = params; -> const { id } = await params;
  content = content.replace(
    /const\s*(\{[^}]+\})\s*=\s*params\s*;/g,
    'const $1 = await params;'
  );

  // Also handle inline destructuring like: params.id -> (await params).id
  // But this is tricky, let's handle simpler cases first

  if (content !== fs.readFileSync(filePath, 'utf-8')) {
    fs.writeFileSync(filePath, content);
    modified = true;
  }

  return modified;
}

async function main() {
  console.log('Finding route files...');
  const routeFiles = findRouteFiles(API_DIR);
  console.log(`Found ${routeFiles.length} route files`);

  let fixed = 0;
  for (const file of routeFiles) {
    if (fixRouteFile(file)) {
      console.log(`Fixed: ${file.replace(API_DIR, '')}`);
      fixed++;
    }
  }

  console.log(`\nFixed ${fixed} files`);
}

main().catch(console.error);
