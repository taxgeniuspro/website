import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createRealAppointments() {
  console.log('Creating real appointments to verify the system works...\n');

  // Get Iran Watkins (iw1) preparer
  const iranWatkins = await prisma.profile.findFirst({
    where: {
      OR: [
        { trackingCode: 'iw1' },
        { customTrackingCode: 'iw1' },
        { shortLinkUsername: 'iw1' }
      ]
    },
    select: { id: true, userId: true, firstName: true, lastName: true }
  });

  if (!iranWatkins) {
    console.error('Could not find Iran Watkins (iw1)');
    await prisma.$disconnect();
    return;
  }

  console.log('Found preparer:', iranWatkins.firstName, iranWatkins.lastName);

  // Create real appointments
  const appointments = [
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@realclient.com',
      phone: '404-555-1234',
      type: 'PHONE_CALL',
      notes: 'First time client, interested in business tax filing',
      scheduledFor: new Date('2025-12-16T10:00:00-05:00'), // Monday 10am
    },
    {
      name: 'Michael Davis',
      email: 'michael.davis@realclient.com',
      phone: '770-555-5678',
      type: 'VIDEO_CALL',
      notes: 'Returning client, W-2 and 1099 forms',
      scheduledFor: new Date('2025-12-16T14:00:00-05:00'), // Monday 2pm
    },
    {
      name: 'Lisa Williams',
      email: 'lisa.williams@realclient.com',
      phone: '678-555-9012',
      type: 'IN_PERSON',
      notes: 'Small business owner, needs help with Schedule C',
      scheduledFor: new Date('2025-12-17T11:00:00-05:00'), // Tuesday 11am
    },
    {
      name: 'James Brown',
      email: 'james.brown@realclient.com',
      phone: '404-555-3456',
      type: 'CONSULTATION',
      notes: 'Callback request - wants to discuss tax planning',
      scheduledFor: null, // Callback request - no scheduled time
    },
    {
      name: 'Emily Taylor',
      email: 'emily.taylor@realclient.com',
      phone: '770-555-7890',
      type: 'PHONE_CALL',
      notes: 'Question about estimated quarterly taxes',
      scheduledFor: new Date('2025-12-18T09:30:00-05:00'), // Wednesday 9:30am
    },
  ];

  const createdAppointments = [];

  for (const appt of appointments) {
    try {
      // Create CRM Contact
      const nameParts = appt.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || firstName;

      let crmContact = await prisma.cRMContact.findUnique({
        where: { email: appt.email.toLowerCase() },
      });

      if (!crmContact) {
        crmContact = await prisma.cRMContact.create({
          data: {
            contactType: 'LEAD',
            firstName,
            lastName,
            email: appt.email.toLowerCase(),
            phone: appt.phone,
            source: 'booking_page',
            stage: 'NEW',
            lastContactedAt: new Date(),
            assignedPreparerId: iranWatkins.userId,
          },
        });
        console.log(`  Created CRM contact: ${appt.name}`);
      }

      // Create Appointment
      const scheduledEnd = appt.scheduledFor
        ? new Date(appt.scheduledFor.getTime() + 30 * 60000) // 30 min duration
        : null;

      const appointment = await prisma.appointment.create({
        data: {
          clientId: crmContact.id,
          clientName: appt.name,
          clientEmail: appt.email.toLowerCase(),
          clientPhone: appt.phone,
          preparerId: iranWatkins.id,
          type: appt.type,
          status: appt.scheduledFor ? 'SCHEDULED' : 'REQUESTED',
          scheduledFor: appt.scheduledFor,
          scheduledEnd: scheduledEnd,
          duration: 30,
          timezone: 'America/New_York',
          clientNotes: appt.notes,
          subject: `${appt.type.replace(/_/g, ' ')} - ${appt.name}`,
        },
      });

      createdAppointments.push(appointment);
      console.log(`✅ Created appointment: ${appt.name} (${appt.type})${appt.scheduledFor ? ' - ' + appt.scheduledFor.toLocaleString() : ' - Callback Request'}`);

      // Create CRM Interaction
      await prisma.cRMInteraction.create({
        data: {
          contactId: crmContact.id,
          type: 'MEETING',
          direction: 'INBOUND',
          subject: `Appointment Requested: ${appt.type.replace(/_/g, ' ')}`,
          body: `Client requested a ${appt.type.replace(/_/g, ' ').toLowerCase()} appointment.\n\nNotes: ${appt.notes}`,
          occurredAt: new Date(),
        },
      });

    } catch (error) {
      console.error(`❌ Error creating appointment for ${appt.name}:`, error.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`Created ${createdAppointments.length} real appointments for Iran Watkins`);
  console.log(`\nTo verify:`);
  console.log(`1. Go to https://taxgeniuspro.tax/en/admin/calendar`);
  console.log(`2. Check that appointments appear in the calendar`);
  console.log(`3. Check the "Requests" tab for callback requests`);
  console.log(`========================================\n`);

  await prisma.$disconnect();
}

createRealAppointments().catch(console.error);
