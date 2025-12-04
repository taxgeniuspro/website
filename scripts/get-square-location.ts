/**
 * Get Square Location ID
 *
 * This script retrieves the location ID from Square API
 * Required for processing payments
 */

import { Client, Environment } from 'square';

async function getSquareLocation() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const environment = process.env.SQUARE_ENVIRONMENT === 'production'
    ? Environment.Production
    : Environment.Sandbox;

  if (!accessToken) {
    console.error('❌ SQUARE_ACCESS_TOKEN not found in environment');
    process.exit(1);
  }

  console.log(`🔍 Fetching Square locations from ${environment}...\n`);

  const client = new Client({
    accessToken,
    environment,
  });

  try {
    const { result } = await client.locationsApi.listLocations();

    if (!result.locations || result.locations.length === 0) {
      console.log('⚠️  No locations found');
      console.log('\n📝 You need to create a location in your Square dashboard:');
      console.log('   https://squareup.com/dashboard/locations\n');
      return;
    }

    console.log(`✅ Found ${result.locations.length} location(s):\n`);
    console.log('━'.repeat(80));

    result.locations.forEach((location, index) => {
      console.log(`\n${index + 1}. ${location.name || 'Unnamed Location'}`);
      console.log(`   Location ID: ${location.id}`);
      console.log(`   Address: ${location.address?.addressLine1 || 'N/A'}`);
      console.log(`   City: ${location.address?.locality || 'N/A'}`);
      console.log(`   State: ${location.address?.administrativeDistrictLevel1 || 'N/A'}`);
      console.log(`   Status: ${location.status || 'N/A'}`);
      console.log(`   Business Name: ${location.businessName || 'N/A'}`);
    });

    console.log('\n' + '━'.repeat(80));

    if (result.locations.length > 0) {
      const primaryLocation = result.locations[0];
      console.log('\n💡 To use the first location, add this to your .env file:');
      console.log(`   SQUARE_LOCATION_ID=${primaryLocation.id}\n`);
    }
  } catch (error: any) {
    console.error('\n❌ Error fetching locations:', error.message);
    if (error.errors) {
      console.error('\nDetails:', JSON.stringify(error.errors, null, 2));
    }
    process.exit(1);
  }
}

getSquareLocation();
