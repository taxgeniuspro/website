import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function simulateBooking() {
  try {
    const clientName = 'Simulation Test Client';
    const clientEmail = 'simulation@booking-test.com';
    const clientPhone = '555-SIM-TEST';
    const appointmentType = 'PHONE_CALL';

    console.log('Step 1: Finding or creating CRM contact...');

    // Parse name
    const nameParts = clientName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Try to find existing contact
    let crmContact = await prisma.cRMContact.findUnique({
      where: { email: clientEmail.toLowerCase() },
    });

    if (!crmContact) {
      console.log('Creating new CRM contact with contactType: LEAD');
      crmContact = await prisma.cRMContact.create({
        data: {
          contactType: 'LEAD',  // This was the fix
          firstName,
          lastName,
          email: clientEmail.toLowerCase(),
          phone: clientPhone,
          source: 'simulation_test',
          stage: 'NEW',
          lastContactedAt: new Date(),
          assignedPreparerId: null,
        },
      });
      console.log('Created CRM contact:', crmContact.id);
    } else {
      console.log('Found existing CRM contact:', crmContact.id);
    }

    console.log('\nStep 2: Finding default preparer...');

    // Get default preparer
    const defaultPreparer = await prisma.profile.findFirst({
      where: {
        OR: [{ role: 'super_admin' }, { role: 'admin' }, { role: 'tax_preparer' }],
        bookingEnabled: true,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, userId: true, firstName: true, lastName: true },
    });

    console.log('Default preparer:', defaultPreparer?.firstName, defaultPreparer?.lastName, defaultPreparer?.id);

    if (!defaultPreparer) {
      throw new Error('No preparer found with booking enabled');
    }

    console.log('\nStep 3: Creating appointment...');

    const appointment = await prisma.appointment.create({
      data: {
        clientId: crmContact.id,
        clientName,
        clientEmail: clientEmail.toLowerCase(),
        clientPhone,
        preparerId: defaultPreparer.id,
        serviceId: null,
        type: appointmentType,
        status: 'REQUESTED',
        scheduledFor: null,
        scheduledEnd: null,
        duration: 30,
        timezone: 'America/New_York',
        clientNotes: 'Simulation test appointment',
        subject: appointmentType.replace(/_/g, ' ') + ' - ' + clientName,
      },
    });

    console.log('\n✅ SUCCESS! Created appointment:', appointment.id);
    console.log('Appointment details:', JSON.stringify(appointment, null, 2));

    // Cleanup
    console.log('\nCleaning up test data...');
    await prisma.appointment.delete({ where: { id: appointment.id } });
    await prisma.cRMContact.delete({ where: { id: crmContact.id } });
    console.log('Test data cleaned up.');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

simulateBooking();
