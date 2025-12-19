import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get the most recent lead (our test submission)
  const lead = await prisma.taxIntakeLead.findFirst({
    where: {
      email: { contains: 'e2etest' },
    },
    orderBy: { created_at: 'desc' },
  });

  if (!lead) {
    console.log('❌ No test lead found');
    await prisma.$disconnect();
    return;
  }

  console.log('='.repeat(80));
  console.log('TEST SUBMISSION VERIFICATION');
  console.log('='.repeat(80));

  console.log(`
Lead ID: ${lead.id}
Name: ${lead.first_name} ${lead.last_name}
Email: ${lead.email}
Phone: ${lead.phone}
Tax Year: ${lead.tax_year}
Created: ${lead.created_at.toISOString()}
Updated: ${lead.updated_at.toISOString()}

=== CRITICAL FLAGS ===
Completed: ${lead.completed ? '✅ YES' : '❌ NO'}
Assigned Preparer: ${lead.assignedPreparerId || 'None'}
Client Folder: ${lead.clientFolderId || 'None'}

=== FULL FORM DATA ===`);

  const fd = lead.full_form_data as any;
  if (fd) {
    console.log(`
SSN: ${fd.ssn ? '✅ ' + fd.ssn : '❌ MISSING'}
DOB: ${fd.date_of_birth ? '✅ ' + fd.date_of_birth : '❌ MISSING'}
Filing Status: ${fd.filing_status ? '✅ ' + fd.filing_status : '❌ MISSING'}
Employment Type: ${fd.employment_type ? '✅ ' + fd.employment_type : '❌ MISSING'}
Occupation: ${fd.occupation ? '✅ ' + fd.occupation : '❌ MISSING'}
Driver License: ${fd.drivers_license ? '✅ ' + fd.drivers_license : '❌ MISSING'}
License Expiration: ${fd.license_expiration ? '✅ ' + fd.license_expiration : '❌ MISSING'}
DL Image URL: ${fd.drivers_license_image_url ? '✅ ' + fd.drivers_license_image_url : '❌ MISSING (no file uploaded)'}
Submitted At: ${fd.submitted_at || 'N/A'}
`);
  } else {
    console.log('❌ No full_form_data');
  }

  // Check CRM contact
  const contact = await prisma.cRMContact.findFirst({
    where: { email: lead.email.toLowerCase() },
  });

  console.log('=== CRM CONTACT ===');
  if (contact) {
    console.log(`
CRM ID: ${contact.id}
Stage: ${contact.stage}
Assigned Preparer: ${contact.assignedPreparerId || 'None'}
Created: ${contact.createdAt.toISOString()}
`);
  } else {
    console.log('❌ No CRM contact found');
  }

  // Get preparer info
  if (lead.assignedPreparerId) {
    const preparer = await prisma.profile.findUnique({
      where: { id: lead.assignedPreparerId },
      include: { user: { select: { email: true } } },
    });
    console.log('=== ASSIGNED PREPARER ===');
    console.log(`Name: ${preparer?.firstName} ${preparer?.lastName}`);
    console.log(`Email: ${preparer?.user?.email}`);
    console.log(`Tracking Code: ${preparer?.customTrackingCode}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
