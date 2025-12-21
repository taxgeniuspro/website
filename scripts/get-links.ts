import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getPreparerLinks() {
  // Find Gelisa White by tracking code
  const gwProfile = await prisma.profile.findFirst({
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

  if (gwProfile) {
    console.log("=== GELISA WHITE (gw) ===");
    console.log("Name:", gwProfile.firstName, gwProfile.lastName);
    console.log("Email:", gwProfile.user?.email);
    console.log("Tracking Code:", gwProfile.customTrackingCode || gwProfile.trackingCode);

    const code = gwProfile.customTrackingCode || gwProfile.trackingCode;
    const baseUrl = "https://taxgeniuspro.tax";

    console.log("\n=== ALL MARKETING LINKS FOR GW ===");
    console.log("Lead Capture:     " + baseUrl + "/go/" + code + "-lead");
    console.log("Intake Form:      " + baseUrl + "/go/" + code + "-intake");
    console.log("Appointment:      " + baseUrl + "/go/" + code + "-appt");
    console.log("Cash Advance:     " + baseUrl + "/en/cash-advance?ref=" + code);
    console.log("Contact Form:     " + baseUrl + "/contact?ref=" + code);
    console.log("Start Filing:     " + baseUrl + "/start-filing/form?ref=" + code);
  }

  // Get marketing links from database for gw
  const gwLinks = await prisma.marketingLink.findMany({
    where: {
      OR: [
        { code: { startsWith: "gw" } },
        { code: "gw" }
      ]
    }
  });

  if (gwLinks.length > 0) {
    console.log("\n=== DATABASE MARKETING LINKS FOR GW ===");
    gwLinks.forEach(link => {
      console.log("https://taxgeniuspro.tax/go/" + link.code, "->", link.targetPage);
    });
  }

  await prisma.$disconnect();
}

getPreparerLinks();
