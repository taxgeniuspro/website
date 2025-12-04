-- ============================================================================
-- Database Reset Script - Keep Only Super Admin (iradwatkins@gmail.com)
-- ============================================================================
-- This script removes all users except the super admin
-- Treating the database as if starting fresh today
-- ============================================================================

BEGIN;

-- Identify the super admin profile to keep
-- clerkUserId: user_33qhzflZSwUZcmVrj78INBIrn6c
-- profileId: cmgp3jh7y0000jxbu46ft7bqs

-- Store the super admin ID for reference
\set SUPER_ADMIN_PROFILE_ID '''cmgp3jh7y0000jxbu46ft7bqs'''
\set SUPER_ADMIN_CLERK_ID '''user_33qhzflZSwUZcmVrj78INBIrn6c'''

-- ============================================================================
-- STEP 1: Delete all CRM contacts (67 contacts)
-- ============================================================================
DELETE FROM crm_email_activities;
DELETE FROM crm_contact_tags;
DELETE FROM crm_interactions;
DELETE FROM crm_lead_scores;
DELETE FROM crm_contacts;
DELETE FROM crm_email_sequences;
DELETE FROM crm_email_campaigns;
DELETE FROM crm_stage_history;
DELETE FROM crm_tags;
DELETE FROM crm_tasks;

-- ============================================================================
-- STEP 2: Delete all leads and referrals
-- ============================================================================
DELETE FROM link_clicks;
DELETE FROM leads;
DELETE FROM referral_analytics;
DELETE FROM referrals;
DELETE FROM tax_intake_leads;

-- ============================================================================
-- STEP 3: Delete all commissions and payouts
-- ============================================================================
DELETE FROM commissions;
DELETE FROM payout_requests;

-- ============================================================================
-- STEP 4: Delete all documents and folders (except super admin's)
-- ============================================================================
DELETE FROM file_operations WHERE "performedBy" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM folder_upload_links WHERE "createdBy" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM documents WHERE "profileId" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM folders WHERE "ownerId" != :SUPER_ADMIN_PROFILE_ID;

-- ============================================================================
-- STEP 5: Delete all email templates (except super admin's)
-- ============================================================================
DELETE FROM email_templates WHERE "profileId" != :SUPER_ADMIN_PROFILE_ID;

-- ============================================================================
-- STEP 6: Delete all tax returns and related data (except super admin's)
-- ============================================================================
DELETE FROM tax_form_edits WHERE "editedBy" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM tax_form_shares;
DELETE FROM client_tax_forms WHERE "assignedBy" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM tax_forms;
DELETE FROM tax_returns WHERE "profileId" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM client_intakes;

-- ============================================================================
-- STEP 7: Delete all support tickets (except super admin's)
-- ============================================================================
DELETE FROM ticket_time_entries WHERE "preparerId" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM ticket_messages WHERE "senderId" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM ticket_workflow_logs;
DELETE FROM support_tickets WHERE "creatorId" != :SUPER_ADMIN_PROFILE_ID;

-- ============================================================================
-- STEP 8: Delete all marketing data (except super admin's)
-- ============================================================================
DELETE FROM mobile_hub_link_clicks;
DELETE FROM mobile_hub_shares;
DELETE FROM mobile_hub_stats;
DELETE FROM marketing_links;
DELETE FROM marketing_campaigns WHERE "creatorId" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM marketing_assets WHERE "profileId" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM marketing_materials;
DELETE FROM landing_pages;
DELETE FROM seo_landing_pages;
DELETE FROM content_performance;
DELETE FROM page_analytics;

-- ============================================================================
-- STEP 9: Delete all orders and payments (except super admin's)
-- ============================================================================
DELETE FROM orders WHERE "userId" != :SUPER_ADMIN_CLERK_ID;
DELETE FROM payments WHERE "profileId" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM subscriptions WHERE "profileId" != :SUPER_ADMIN_PROFILE_ID;

-- ============================================================================
-- STEP 10: Delete all notifications (except super admin's)
-- ============================================================================
DELETE FROM notifications WHERE "profileId" != :SUPER_ADMIN_PROFILE_ID;

-- ============================================================================
-- STEP 11: Delete all appointments and bookings
-- ============================================================================
DELETE FROM appointments;
DELETE FROM preparer_availability;
DELETE FROM booking_services;

-- ============================================================================
-- STEP 12: Delete all gamification data (except super admin's)
-- ============================================================================
DELETE FROM daily_challenge_completions WHERE "userId" != :SUPER_ADMIN_CLERK_ID;
DELETE FROM user_achievements WHERE "userId" != :SUPER_ADMIN_CLERK_ID;
DELETE FROM user_stats WHERE "userId" != :SUPER_ADMIN_CLERK_ID;
DELETE FROM contest_leaderboards;
DELETE FROM contest_participants WHERE "profileId" != :SUPER_ADMIN_PROFILE_ID;
DELETE FROM contests;
DELETE FROM daily_challenges;

-- ============================================================================
-- STEP 13: Delete all chat data
-- ============================================================================
DELETE FROM chat_messages;
DELETE FROM chat_participants;
DELETE FROM chat_rooms;

-- ============================================================================
-- STEP 14: Delete all tax assistant data
-- ============================================================================
DELETE FROM tax_assistant_messages;
DELETE FROM tax_assistant_threads;

-- ============================================================================
-- STEP 15: Delete all affiliate bondings and preparer applications
-- ============================================================================
DELETE FROM affiliate_bondings;
DELETE FROM preparer_applications;
DELETE FROM referrer_applications;
DELETE FROM client_preparers WHERE "clientId" != :SUPER_ADMIN_PROFILE_ID AND "preparerId" != :SUPER_ADMIN_PROFILE_ID;

-- ============================================================================
-- STEP 16: Delete saved replies (except super admin's)
-- ============================================================================
DELETE FROM saved_replies WHERE "createdById" != :SUPER_ADMIN_PROFILE_ID;

-- ============================================================================
-- STEP 17: Delete professional email aliases (except super admin's)
-- ============================================================================
DELETE FROM professional_email_aliases WHERE "profileId" != :SUPER_ADMIN_PROFILE_ID;

-- ============================================================================
-- STEP 18: Delete all other profiles (KEEP ONLY SUPER ADMIN)
-- ============================================================================
-- This will cascade delete many related records automatically
DELETE FROM profiles WHERE id != :SUPER_ADMIN_PROFILE_ID;

-- ============================================================================
-- STEP 19: Clean up orphaned records
-- ============================================================================
DELETE FROM sessions WHERE "userId" NOT IN (SELECT id FROM users);
DELETE FROM magic_links WHERE "userId" NOT IN (SELECT id FROM users);
DELETE FROM oauth_accounts WHERE "userId" NOT IN (SELECT id FROM users);

-- ============================================================================
-- STEP 20: Delete unused data
-- ============================================================================
DELETE FROM product_campaign_queue;
DELETE FROM product_seo_content;
DELETE FROM access_attempt_logs;
DELETE FROM follow_up_logs;
DELETE FROM translations;
DELETE FROM content_snapshots;
DELETE FROM content_restrictions;
DELETE FROM page_restrictions;

-- ============================================================================
-- Verification: Count remaining records
-- ============================================================================
SELECT
  'profiles' as table_name,
  COUNT(*) as count,
  'Should be 1 (super admin only)' as expected
FROM profiles

UNION ALL

SELECT
  'crm_contacts' as table_name,
  COUNT(*) as count,
  'Should be 0' as expected
FROM crm_contacts

UNION ALL

SELECT
  'leads' as table_name,
  COUNT(*) as count,
  'Should be 0' as expected
FROM leads

UNION ALL

SELECT
  'referrals' as table_name,
  COUNT(*) as count,
  'Should be 0' as expected
FROM referrals

UNION ALL

SELECT
  'users' as table_name,
  COUNT(*) as count,
  'Should be 0 (Clerk handles auth)' as expected
FROM users;

COMMIT;
