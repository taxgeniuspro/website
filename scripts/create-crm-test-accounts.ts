/**
 * Create CRM Test Accounts
 *
 * Creates two test accounts:
 * 1. Admin account with full access
 * 2. Tax Preparer account with CRM permissions
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creating CRM test accounts...\n');

  // Test Admin Account
  const adminEmail = 'admin@taxgeniuspro.test';
  const adminPassword = 'Admin123!CRM';

  // Test Tax Preparer Account
  const preparerEmail = 'preparer@taxgeniuspro.test';
  const preparerPassword = 'Preparer123!CRM';

  try {
    // Create Admin User
    console.log('Creating admin account...');
    let adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          hashedPassword: hashedAdminPassword,
          emailVerified: new Date(),
        },
      });
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create Admin Profile
    let adminProfile = await prisma.profile.findUnique({
      where: { userId: adminUser.id },
    });

    if (!adminProfile) {
      adminProfile = await prisma.profile.create({
        data: {
          userId: adminUser.id,
          firstName: 'Test',
          lastName: 'Admin',
          role: 'admin',
          phone: '555-0001',
          // Admin gets all CRM permissions by default
          crmEmailAutomation: true,
          crmWorkflowAutomation: true,
          crmActivityTracking: true,
          crmAdvancedAnalytics: true,
          crmTaskManagement: true,
          crmLeadScoring: true,
          crmBulkActions: true,
        },
      });
      console.log('✅ Admin profile created with all CRM permissions');
    } else if (adminProfile.role !== 'admin') {
      // Update to admin if not already
      adminProfile = await prisma.profile.update({
        where: { id: adminProfile.id },
        data: {
          role: 'admin',
          firstName: 'Test',
          lastName: 'Admin',
          crmEmailAutomation: true,
          crmWorkflowAutomation: true,
          crmActivityTracking: true,
          crmAdvancedAnalytics: true,
          crmTaskManagement: true,
          crmLeadScoring: true,
          crmBulkActions: true,
        },
      });
      console.log('✅ Admin profile updated');
    } else {
      console.log('ℹ️  Admin profile already exists');
    }

    // Create Tax Preparer User
    console.log('\nCreating tax preparer account...');
    let preparerUser = await prisma.user.findUnique({
      where: { email: preparerEmail },
    });

    if (!preparerUser) {
      const hashedPreparerPassword = await bcrypt.hash(preparerPassword, 10);

      preparerUser = await prisma.user.create({
        data: {
          email: preparerEmail,
          hashedPassword: hashedPreparerPassword,
          emailVerified: new Date(),
        },
      });
      console.log('✅ Tax preparer user created');
    } else {
      console.log('ℹ️  Tax preparer user already exists');
    }

    // Create Tax Preparer Profile
    let preparerProfile = await prisma.profile.findUnique({
      where: { userId: preparerUser.id },
    });

    if (!preparerProfile) {
      preparerProfile = await prisma.profile.create({
        data: {
          userId: preparerUser.id,
          firstName: 'Sarah',
          lastName: 'Martinez',
          role: 'tax_preparer',
          phone: '555-0002',
          // Give this preparer some CRM permissions (not all)
          crmEmailAutomation: true,
          crmWorkflowAutomation: false,      // No workflow automation
          crmActivityTracking: true,
          crmAdvancedAnalytics: false,       // No advanced analytics
          crmTaskManagement: true,
          crmLeadScoring: true,
          crmBulkActions: false,             // No bulk actions
        },
      });
      console.log('✅ Tax preparer profile created with partial CRM permissions');
    } else if (preparerProfile.role !== 'tax_preparer') {
      // Update to tax_preparer if not already
      preparerProfile = await prisma.profile.update({
        where: { id: preparerProfile.id },
        data: {
          role: 'tax_preparer',
          firstName: 'Sarah',
          lastName: 'Martinez',
          crmEmailAutomation: true,
          crmWorkflowAutomation: false,
          crmActivityTracking: true,
          crmAdvancedAnalytics: false,
          crmTaskManagement: true,
          crmLeadScoring: true,
          crmBulkActions: false,
        },
      });
      console.log('✅ Tax preparer profile updated');
    } else {
      console.log('ℹ️  Tax preparer profile already exists');
    }

    // Create a test lead assigned to the tax preparer
    console.log('\nCreating test lead...');
    const existingLead = await prisma.taxIntakeLead.findFirst({
      where: {
        email: 'testlead@example.com',
      },
    });

    if (!existingLead) {
      const testLead = await prisma.taxIntakeLead.create({
        data: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'testlead@example.com',
          phone: '555-1234',
          state: 'CA',
          filing_status: 'married_filing_jointly',
          estimated_income: 125000,
          source: 'website',
          assignedTo: preparerProfile.id,
          leadScore: 75,
          urgency: 'HIGH',
          emailOpens: 3,
          emailClicks: 1,
          completed: false,
          contactRequested: true,
        },
      });

      // Add some activities to the test lead
      await prisma.leadActivity.createMany({
        data: [
          {
            leadId: testLead.id,
            activityType: 'CONTACT_ATTEMPTED',
            title: 'Initial outreach call',
            description: 'Left voicemail introducing Tax Genius services',
            createdBy: preparerProfile.id,
            createdByName: 'Sarah Martinez',
            automated: false,
          },
          {
            leadId: testLead.id,
            activityType: 'EMAIL_SENT',
            title: 'Welcome email sent',
            description: 'Automated welcome sequence email #1',
            automated: true,
          },
          {
            leadId: testLead.id,
            activityType: 'EMAIL_OPENED',
            title: 'Email opened',
            description: 'Lead opened welcome email',
            automated: true,
          },
        ],
      });

      // Add some tasks for the test lead
      await prisma.leadTask.createMany({
        data: [
          {
            leadId: testLead.id,
            title: 'Follow up call',
            description: 'Call to discuss tax preparation needs',
            status: 'TODO',
            priority: 'HIGH',
            assignedTo: preparerProfile.id,
            assignedToName: 'Sarah Martinez',
            createdBy: preparerProfile.id,
            createdByName: 'Sarah Martinez',
            dueDate: new Date(Date.now() + 86400000), // Tomorrow
          },
          {
            leadId: testLead.id,
            title: 'Collect W-2 documents',
            description: 'Request all W-2 forms from employer',
            status: 'TODO',
            priority: 'MEDIUM',
            assignedTo: preparerProfile.id,
            assignedToName: 'Sarah Martinez',
            createdBy: preparerProfile.id,
            createdByName: 'Sarah Martinez',
            dueDate: new Date(Date.now() + 259200000), // 3 days
          },
        ],
      });

      console.log('✅ Test lead created with activities and tasks');
    } else {
      console.log('ℹ️  Test lead already exists');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 CRM TEST ACCOUNTS READY!');
    console.log('='.repeat(60));

    console.log('\n📧 ADMIN ACCOUNT:');
    console.log('   Email:    ' + adminEmail);
    console.log('   Password: ' + adminPassword);
    console.log('   Role:     Admin (Full CRM Access)');
    console.log('   Dashboard: https://taxgeniuspro.tax/dashboard/admin');
    console.log('   CRM Permissions: https://taxgeniuspro.tax/admin/crm/permissions');

    console.log('\n👤 TAX PREPARER ACCOUNT:');
    console.log('   Email:    ' + preparerEmail);
    console.log('   Password: ' + preparerPassword);
    console.log('   Name:     Sarah Martinez');
    console.log('   Role:     Tax Preparer (Partial CRM Access)');
    console.log('   Dashboard: https://taxgeniuspro.tax/dashboard/tax-preparer');

    console.log('\n✅ ENABLED CRM FEATURES (for Sarah):');
    console.log('   ✓ Email Automation');
    console.log('   ✓ Activity Timeline');
    console.log('   ✓ Task Management');
    console.log('   ✓ Lead Scoring');

    console.log('\n❌ DISABLED CRM FEATURES (for Sarah):');
    console.log('   ✗ Workflow Automation (locked)');
    console.log('   ✗ Advanced Analytics (locked)');
    console.log('   ✗ Bulk Actions (locked)');

    console.log('\n📊 TEST DATA:');
    console.log('   • 1 test lead (John Doe) assigned to Sarah');
    console.log('   • 3 activities in timeline');
    console.log('   • 2 tasks pending');
    console.log('   • Lead Score: 75 (HIGH urgency)');

    console.log('\n🧪 TO TEST:');
    console.log('   1. Login as admin → Go to /admin/crm/permissions');
    console.log('   2. Toggle Sarah\'s permissions and see changes');
    console.log('   3. Login as Sarah → View dashboard');
    console.log('   4. Try accessing locked vs unlocked features');
    console.log('   5. View test lead\'s activity timeline and tasks');

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
