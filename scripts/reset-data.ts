/**
 * Data Reset Script
 *
 * Resets all transactional/lead data while preserving:
 * - Users (User model)
 * - Profiles (Profile model with settings, avatars, QR codes, marketing links)
 * - Accounts (OAuth connections)
 * - Sessions
 * - MarketingLinks (preparer short links)
 * - BookingServices
 * - PreparerAvailability
 * - SystemSettings
 *
 * DELETES:
 * - Leads, TaxIntakeLeads, LeadActivity, LeadTask
 * - CRMContacts, CRMInteraction, CRMStageHistory, CRMTask, etc.
 * - Appointments (test appointments only)
 * - LinkClicks (analytics)
 * - Orders, Payments, Commissions
 * - Documents, Folders (client uploaded files)
 * - TaxReturns, ClientTaxForms
 * - SupportTickets, ChatMessages
 * - Notifications
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetData() {
  console.log('=== Data Reset Script ===\n');
  console.log('This will DELETE all transactional data while preserving user accounts and preparer settings.\n');

  // Show current counts before deletion
  console.log('📊 Current Data Counts:');

  const counts = await Promise.all([
    prisma.user.count().then(c => ({ model: 'User', count: c, preserve: true })),
    prisma.profile.count().then(c => ({ model: 'Profile', count: c, preserve: true })),
    prisma.marketingLink.count().then(c => ({ model: 'MarketingLink', count: c, preserve: true })),
    prisma.lead.count().then(c => ({ model: 'Lead', count: c, preserve: false })),
    prisma.taxIntakeLead.count().then(c => ({ model: 'TaxIntakeLead', count: c, preserve: false })),
    prisma.cRMContact.count().then(c => ({ model: 'CRMContact', count: c, preserve: false })),
    prisma.appointment.count().then(c => ({ model: 'Appointment', count: c, preserve: false })),
    prisma.linkClick.count().then(c => ({ model: 'LinkClick', count: c, preserve: false })),
    prisma.order.count().then(c => ({ model: 'Order', count: c, preserve: false })),
    prisma.payment.count().then(c => ({ model: 'Payment', count: c, preserve: false })),
    prisma.commission.count().then(c => ({ model: 'Commission', count: c, preserve: false })),
    prisma.document.count().then(c => ({ model: 'Document', count: c, preserve: false })),
    prisma.folder.count().then(c => ({ model: 'Folder', count: c, preserve: false })),
    prisma.taxReturn.count().then(c => ({ model: 'TaxReturn', count: c, preserve: false })),
    prisma.notification.count().then(c => ({ model: 'Notification', count: c, preserve: false })),
    prisma.supportTicket.count().then(c => ({ model: 'SupportTicket', count: c, preserve: false })),
  ]);

  for (const { model, count, preserve } of counts) {
    const status = preserve ? '✅ KEEP' : '🗑️  DELETE';
    console.log(`  ${status} ${model}: ${count}`);
  }

  console.log('\n🚀 Starting deletion (order matters for foreign keys)...\n');

  // Delete in order to respect foreign key constraints
  // Start with dependent tables first

  // 1. CRM-related (depends on TaxIntakeLead, CRMContact)
  console.log('Deleting CRM data...');
  await prisma.cRMLeadScore.deleteMany({});
  await prisma.cRMEmailActivity.deleteMany({});
  await prisma.cRMEmailSequence.deleteMany({});
  await prisma.cRMEmailCampaign.deleteMany({});
  await prisma.cRMTask.deleteMany({});
  await prisma.cRMContactTag.deleteMany({});
  await prisma.cRMTag.deleteMany({});
  await prisma.cRMStageHistory.deleteMany({});
  await prisma.cRMInteraction.deleteMany({});
  await prisma.cRMWorkflowExecution.deleteMany({});
  await prisma.cRMWorkflowAction.deleteMany({});
  await prisma.cRMWorkflow.deleteMany({});
  await prisma.cRMContact.deleteMany({});
  console.log('  ✓ CRM data deleted');

  // 2. Lead-related (LeadActivity, LeadTask depend on TaxIntakeLead)
  console.log('Deleting Lead data...');
  await prisma.leadActivity.deleteMany({});
  await prisma.leadTask.deleteMany({});
  await prisma.taxIntakeLead.deleteMany({});
  await prisma.lead.deleteMany({});
  console.log('  ✓ Lead data deleted');

  // 3. Appointments & Follow-ups
  console.log('Deleting Appointment data...');
  await prisma.followUpLog.deleteMany({});
  await prisma.appointment.deleteMany({});
  console.log('  ✓ Appointment data deleted');

  // 4. Analytics (LinkClick depends on MarketingLink - but we keep MarketingLink)
  console.log('Deleting Analytics data...');
  await prisma.linkClick.deleteMany({});
  await prisma.mobileHubLinkClick.deleteMany({});
  await prisma.mobileHubShare.deleteMany({});
  await prisma.mobileHubStats.deleteMany({});
  await prisma.pageAnalytics.deleteMany({});
  await prisma.contentPerformance.deleteMany({});
  console.log('  ✓ Analytics data deleted');

  // 5. Financial (Commission, Payment, Order)
  console.log('Deleting Financial data...');
  await prisma.commission.deleteMany({});
  await prisma.payoutRequest.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  console.log('  ✓ Financial data deleted');

  // 6. Documents & Folders
  console.log('Deleting Document data...');
  await prisma.fileOperation.deleteMany({});
  await prisma.folderUploadLink.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.folder.deleteMany({});
  console.log('  ✓ Document data deleted');

  // 7. Tax Forms & Returns
  console.log('Deleting Tax Form data...');
  await prisma.formSignature.deleteMany({});
  await prisma.taxFormEdit.deleteMany({});
  await prisma.clientTaxForm.deleteMany({});
  await prisma.taxFormShare.deleteMany({});
  await prisma.taxReturn.deleteMany({});
  console.log('  ✓ Tax Form data deleted');

  // 8. Support & Chat
  console.log('Deleting Support data...');
  await prisma.ticketWorkflowLog.deleteMany({});
  await prisma.ticketTimeEntry.deleteMany({});
  await prisma.ticketMessage.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.chatParticipant.deleteMany({});
  await prisma.chatRoom.deleteMany({});
  console.log('  ✓ Support data deleted');

  // 9. Notifications
  console.log('Deleting Notifications...');
  await prisma.notification.deleteMany({});
  console.log('  ✓ Notifications deleted');

  // 10. AI Assistant threads
  console.log('Deleting AI Assistant data...');
  await prisma.taxAssistantMessage.deleteMany({});
  await prisma.taxAssistantThread.deleteMany({});
  console.log('  ✓ AI Assistant data deleted');

  // 11. Client Intake (separate from TaxIntakeLead)
  console.log('Deleting Client Intake data...');
  await prisma.clientIntake.deleteMany({});
  console.log('  ✓ Client Intake data deleted');

  // 12. Referral Analytics (but keep Referrals)
  console.log('Deleting Referral Analytics...');
  await prisma.referralAnalytics.deleteMany({});
  console.log('  ✓ Referral Analytics deleted');

  // 13. Access Logs
  console.log('Deleting Access Logs...');
  await prisma.accessAttemptLog.deleteMany({});
  console.log('  ✓ Access Logs deleted');

  // Show counts after deletion
  console.log('\n📊 Data Counts After Reset:');

  const afterCounts = await Promise.all([
    prisma.user.count().then(c => ({ model: 'User', count: c })),
    prisma.profile.count().then(c => ({ model: 'Profile', count: c })),
    prisma.marketingLink.count().then(c => ({ model: 'MarketingLink', count: c })),
    prisma.lead.count().then(c => ({ model: 'Lead', count: c })),
    prisma.taxIntakeLead.count().then(c => ({ model: 'TaxIntakeLead', count: c })),
    prisma.cRMContact.count().then(c => ({ model: 'CRMContact', count: c })),
    prisma.appointment.count().then(c => ({ model: 'Appointment', count: c })),
  ]);

  for (const { model, count } of afterCounts) {
    console.log(`  ${model}: ${count}`);
  }

  console.log('\n✅ Data reset complete!');
  console.log('\nPreserved:');
  console.log('  - All User accounts');
  console.log('  - All Profile settings (avatars, QR codes, tracking codes)');
  console.log('  - All MarketingLinks (short links)');
  console.log('  - BookingServices & PreparerAvailability');
  console.log('  - SystemSettings');
}

resetData()
  .catch((error) => {
    console.error('Error during reset:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
