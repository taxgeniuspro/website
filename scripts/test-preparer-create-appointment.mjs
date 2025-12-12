import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * This script simulates what the admin/appointments/create API does
 * when a tax preparer manually creates an appointment.
 */
async function testPreparerCreateAppointment() {
  console.log('Simulating preparer manual appointment creation...\n');

  // Get Iran Watkins as the preparer
  const preparer = await prisma.profile.findFirst({
    where: {
      OR: [
        { trackingCode: 'iw1' },
        { customTrackingCode: 'iw1' },
        { shortLinkUsername: 'iw1' }
      ]
    },
    select: { id: true, firstName: true, lastName: true }
  });

  if (!preparer) {
    console.error('Could not find preparer');
    await prisma.$disconnect();
    return;
  }

  console.log('Creating appointment as:', preparer.firstName, preparer.lastName);

  // Create a manual appointment (simulating admin dashboard creation)
  const clientName = 'Manually Added Client';
  const clientEmail = 'manual.client@preparer-test.com';
  const clientPhone = '555-MANUAL-1';
  const scheduledFor = new Date('2025-12-19T13:00:00-05:00'); // Friday 1pm
  const duration = 45; // 45 minute appointment

  try {
    // First, create or find a CRM contact
    let crmContact = await prisma.cRMContact.findUnique({
      where: { email: clientEmail.toLowerCase() }
    });

    if (!crmContact) {
      const [firstName, ...lastNameParts] = clientName.split(' ');
      crmContact = await prisma.cRMContact.create({
        data: {
          contactType: 'LEAD',
          firstName,
          lastName: lastNameParts.join(' ') || firstName,
          email: clientEmail.toLowerCase(),
          phone: clientPhone,
          source: 'manual_entry',
          stage: 'NEW',
          assignedPreparerId: preparer.id,
        }
      });
      console.log('Created CRM contact:', crmContact.id);
    }

    // Create the appointment
    const scheduledEnd = new Date(scheduledFor.getTime() + duration * 60000);

    const appointment = await prisma.appointment.create({
      data: {
        clientId: crmContact.id,
        clientName,
        clientEmail: clientEmail.toLowerCase(),
        clientPhone,
        preparerId: preparer.id,
        type: 'CONSULTATION',
        status: 'SCHEDULED', // Preparer-created appointments are immediately scheduled
        scheduledFor,
        scheduledEnd,
        duration,
        subject: 'Initial Tax Consultation',
        notes: 'Client referred by existing client. Needs help with business taxes.',
        location: 'Office - Suite 200',
        timezone: 'America/New_York',
      }
    });

    console.log('\n✅ SUCCESS! Created appointment:', appointment.id);
    console.log('Appointment details:');
    console.log('  Client:', appointment.clientName);
    console.log('  Type:', appointment.type);
    console.log('  Status:', appointment.status);
    console.log('  Scheduled:', appointment.scheduledFor?.toLocaleString());
    console.log('  Duration:', appointment.duration, 'minutes');
    console.log('  Location:', appointment.location);

    // Create CRM interaction
    await prisma.cRMInteraction.create({
      data: {
        contactId: crmContact.id,
        type: 'MEETING',
        direction: 'OUTBOUND',
        subject: 'Appointment Scheduled by Preparer',
        body: `Tax preparer ${preparer.firstName} ${preparer.lastName} scheduled an appointment.\n\nNotes: ${appointment.notes}`,
        occurredAt: new Date(),
      }
    });

    console.log('\nCreated CRM interaction for the appointment');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPreparerCreateAppointment();
