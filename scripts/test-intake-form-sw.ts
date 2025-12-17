import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testIntakeFormWithRef() {
  console.log('=== Testing Tax Intake Form via sw-intake ===\n');

  const timestamp = Date.now();
  const testEmail = `test-intake-sw-${timestamp}@example.com`;

  const testData = {
    // Personal Information
    first_name: 'John',
    middle_name: 'Michael',
    last_name: 'TestClient',
    email: testEmail,
    phone: '404-555-9876',
    country_code: '+1',
    date_of_birth: '1985-06-15',
    ssn: '123-45-6789',
    // Address
    address_line_1: '123 Test Street',
    address_line_2: 'Apt 456',
    city: 'Atlanta',
    state: 'GA',
    zip_code: '30301',
    // Tax Filing Details
    filing_status: 'single',
    employment_type: 'employed',
    occupation: 'Software Developer',
    claimed_as_dependent: 'no',
    in_college: 'no',
    has_dependents: 'no',
    number_of_dependents: 0,
    has_mortgage: 'no',
    denied_eitc: 'no',
    has_irs_pin: 'no',
    wants_refund_advance: 'no',
    drivers_license: 'DL123456789',
    license_expiration: '2028-06-15',
    locale: 'en',
    tax_year: 2024,
  };

  console.log('Submitting tax intake form with ref=sw (Sarah Wilson):');
  console.log(`Name: ${testData.first_name} ${testData.last_name}`);
  console.log(`Email: ${testData.email}`);
  console.log(`Phone: ${testData.phone}`);
  console.log('\n');

  try {
    // Submit to the tax intake API with ref=sw
    const response = await fetch('https://taxgeniuspro.tax/api/tax-intake/lead?ref=sw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Tax intake form submitted successfully!');
      console.log('Lead ID:', result.leadId);

      // Wait a moment for DB to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check TaxIntakeLead record
      const taxLead = await prisma.taxIntakeLead.findUnique({
        where: { id: result.leadId },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          assignedPreparerId: true,
          referrerUsername: true,
          referrerType: true,
          attributionMethod: true,
        }
      });

      console.log('\n=== Tax Intake Lead Record ===');
      console.log(JSON.stringify(taxLead, null, 2));

      if (taxLead?.assignedPreparerId) {
        // Get preparer info
        const preparer = await prisma.user.findUnique({
          where: { id: taxLead.assignedPreparerId },
          select: { name: true, email: true }
        });
        console.log('\n=== Assigned Preparer ===');
        console.log('Name:', preparer?.name);
        console.log('Email:', preparer?.email);
        console.log('\n📧 Email should have been sent to:', preparer?.email);
      }

      // Check CRM contact
      const crmContact = await prisma.cRMContact.findUnique({
        where: { email: testEmail.toLowerCase() },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          source: true,
          assignedPreparerId: true,
          referrerUsername: true,
          referrerType: true,
          attributionMethod: true,
        }
      });

      console.log('\n=== CRM Contact Record ===');
      console.log(JSON.stringify(crmContact, null, 2));

      // Check CRM interaction
      if (crmContact) {
        const interaction = await prisma.cRMInteraction.findFirst({
          where: { contactId: crmContact.id },
          orderBy: { createdAt: 'desc' },
          select: {
            subject: true,
            body: true,
          }
        });

        console.log('\n=== CRM Interaction ===');
        console.log('Subject:', interaction?.subject);
        console.log('Body preview:', interaction?.body?.substring(0, 500) + '...');
      }

    } else {
      console.log('\n❌ Tax intake form submission failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  try {
    await testIntakeFormWithRef();
  } finally {
    await prisma.$disconnect();
  }
}

main();
