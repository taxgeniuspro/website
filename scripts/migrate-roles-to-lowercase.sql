-- Migration: Convert UserRole enum values from UPPERCASE to lowercase
-- This migration updates all existing role values in the database

BEGIN;

-- Step 1: Update all existing Profile role values to lowercase
UPDATE profiles
SET role = CASE
  WHEN role = 'SUPER_ADMIN' THEN 'super_admin'
  WHEN role = 'ADMIN' THEN 'admin'
  WHEN role = 'TAX_PREPARER' THEN 'tax_preparer'
  WHEN role = 'AFFILIATE' THEN 'affiliate'
  WHEN role = 'CLIENT' THEN 'client'
  WHEN role = 'LEAD' THEN 'lead'
  ELSE role
END;

-- Step 2: Verify the update
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role;

COMMIT;
