import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignLeadToGelisa() {
  // Find Gelisa White by tracking code
  const gelisaProfile = await prisma.profile.findFirst({
    where: {
      OR: [
        { customTrackingCode: "gw" },
        { trackingCode: "gw" },
        { shortLinkUsername: "gw" }
      ]
    },
    include: {
      user: { select: { email: true } }
    }
  });

  if (!gelisaProfile) {
    console.log("ERROR: Could not find Gelisa White's profile");
    await prisma.$disconnect();
    return;
  }

  console.log("=== GELISA WHITE ===");
  console.log("Profile ID:", gelisaProfile.id);
  console.log("Name:", gelisaProfile.firstName, gelisaProfile.lastName);
  console.log("Email:", gelisaProfile.user?.email);

  // Find Cazmyr Glenn in TaxIntakeLead table
  const lead = await prisma.taxIntakeLead.findFirst({
    where: {
      OR: [
        { email: "cazmyrg95@gmail.com" },
        { first_name: { contains: "Cazmyr", mode: "insensitive" } }
      ]
    }
  });

  if (!lead) {
    console.log("\nERROR: Could not find lead Cazmyr Glenn");
    await prisma.$disconnect();
    return;
  }

  console.log("\n=== LEAD DETAILS: CAZMYR GLENN ===");
  console.log("Lead ID:", lead.id);
  console.log("Name:", lead.first_name, lead.last_name);
  console.log("Email:", lead.email);
  console.log("Phone:", lead.phone);
  console.log("Current Assigned Preparer ID:", lead.assignedPreparerId || "NONE");
  console.log("Created At:", lead.createdAt);

  // Update the lead to assign to Gelisa
  const updatedLead = await prisma.taxIntakeLead.update({
    where: { id: lead.id },
    data: { assignedPreparerId: gelisaProfile.id }
  });

  console.log("\n=== ASSIGNMENT COMPLETE ===");
  console.log("Cazmyr Glenn is now assigned to Gelisa White");
  console.log("Lead ID:", updatedLead.id);
  console.log("Assigned Preparer ID:", updatedLead.assignedPreparerId);

  console.log("\n=== INFORMATION TO SEND GELISA ===");
  console.log("---------------------------------------");
  console.log("NEW LEAD ASSIGNED TO YOU:");
  console.log("Name:", lead.first_name, lead.last_name);
  console.log("Email:", lead.email);
  console.log("Phone:", lead.phone);
  console.log("---------------------------------------");

  await prisma.$disconnect();
}

assignLeadToGelisa().catch(console.error);
