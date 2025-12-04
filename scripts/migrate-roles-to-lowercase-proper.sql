-- Migration: Convert UserRole enum from UPPERCASE to lowercase
-- This is a multi-step process because PostgreSQL enums are immutable

BEGIN;

-- Step 1: Add new lowercase enum values to the existing enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'lead';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'tax_preparer';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'affiliate';

COMMIT;

-- Step 2: Update all existing role values to lowercase (separate transaction)
BEGIN;

UPDATE profiles
SET role = CASE
  WHEN role = 'SUPER_ADMIN' THEN 'super_admin'::text::"UserRole"
  WHEN role = 'ADMIN' THEN 'admin'::text::"UserRole"
  WHEN role = 'TAX_PREPARER' THEN 'tax_preparer'::text::"UserRole"
  WHEN role = 'AFFILIATE' THEN 'affiliate'::text::"UserRole"
  WHEN role = 'CLIENT' THEN 'client'::text::"UserRole"
  WHEN role = 'LEAD' THEN 'lead'::text::"UserRole"
  ELSE role
END;

-- Step 3: Verify the update
SELECT role::text as role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role;

COMMIT;
