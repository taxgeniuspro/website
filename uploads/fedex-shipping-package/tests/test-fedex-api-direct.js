/**
 * Direct FedEx Shipping API Test
 * Tests the shipping rates API with 4 different address scenarios
 */

const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:3020'

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Residential - Los Angeles (expect GROUND_HOME_DELIVERY)',
    destination: {
      zipCode: '90210',
      state: 'CA',
      city: 'Los Angeles',
      countryCode: 'US',
      isResidential: true,
    },
    packages: [{ weight: 5 }],
    expectedServices: ['GROUND_HOME_DELIVERY', 'FEDEX_2_DAY', 'STANDARD_OVERNIGHT', 'SMART_POST'],
    expectedCount: 4,
  },
  {
    name: 'Business - Chicago (expect FEDEX_GROUND)',
    destination: {
      zipCode: '60173',
      state: 'IL',
      city: 'Chicago',
      countryCode: 'US',
      isResidential: false,
    },
    packages: [{ weight: 5 }],
    expectedServices: ['FEDEX_GROUND', 'FEDEX_2_DAY', 'STANDARD_OVERNIGHT', 'SMART_POST'],
    expectedCount: 4,
  },
  {
    name: 'Residential - Miami (expect GROUND_HOME_DELIVERY)',
    destination: {
      zipCode: '33139',
      state: 'FL',
      city: 'Miami',
      countryCode: 'US',
      isResidential: true,
    },
    packages: [{ weight: 5 }],
    expectedServices: ['GROUND_HOME_DELIVERY', 'FEDEX_2_DAY', 'STANDARD_OVERNIGHT', 'SMART_POST'],
    expectedCount: 4,
  },
  {
    name: 'Business - New York (expect FEDEX_GROUND)',
    destination: {
      zipCode: '10007',
      state: 'NY',
      city: 'New York',
      countryCode: 'US',
      isResidential: false,
    },
    packages: [{ weight: 5 }],
    expectedServices: ['FEDEX_GROUND', 'FEDEX_2_DAY', 'STANDARD_OVERNIGHT', 'SMART_POST'],
    expectedCount: 4,
  },
]

async function testShippingRates() {
  console.log('\n🚀 FedEx Shipping API Test')
  console.log('=' + '='.repeat(79))

  const results = []

  for (const [index, scenario] of TEST_SCENARIOS.entries()) {
    console.log(`\n📦 Test ${index + 1}: ${scenario.name}`)
    console.log('-'.repeat(80))

    try {
      const response = await fetch(`${BASE_URL}/api/shipping/rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: scenario.destination,
          packages: scenario.packages,
        }),
      })

      const data = await response.json()

      console.log(`Status: ${response.status}`)
      console.log(`Success: ${data.success}`)

      if (!data.success) {
        console.log(`❌ API Error: ${data.error || 'Unknown error'}`)
        results.push({
          scenario: scenario.name,
          success: false,
          error: data.error || 'API request failed',
        })
        continue
      }

      // Filter for FedEx rates
      const fedexRates = data.rates.filter((r) => r.provider === 'FedEx' || r.carrier === 'FEDEX')

      console.log(`\n✅ FedEx Rates Found: ${fedexRates.length}`)
      console.log(`Expected: ${scenario.expectedCount}`)

      fedexRates.forEach((rate) => {
        const match = scenario.expectedServices.includes(rate.serviceCode)
        const icon = match ? '✅' : '⚠️ '
        console.log(`  ${icon} ${rate.serviceName} (${rate.serviceCode}) - $${rate.rateAmount}`)
      })

      // Verify all expected services are present
      const serviceCodes = fedexRates.map((r) => r.serviceCode)
      const missingServices = scenario.expectedServices.filter((s) => !serviceCodes.includes(s))

      if (missingServices.length > 0) {
        console.log(`\n❌ Missing Expected Services:`)
        missingServices.forEach((s) => console.log(`   - ${s}`))
      }

      const testPassed = fedexRates.length === scenario.expectedCount && missingServices.length === 0

      console.log(`\n📊 Test Result: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`)

      results.push({
        scenario: scenario.name,
        success: testPassed,
        fedexRatesFound: fedexRates.length,
        expectedCount: scenario.expectedCount,
        serviceCodes,
        missingServices,
        rates: fedexRates.map((r) => ({
          serviceCode: r.serviceCode,
          serviceName: r.serviceName,
          amount: r.rateAmount,
        })),
      })
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
      results.push({
        scenario: scenario.name,
        success: false,
        error: error.message,
      })
    }
  }

  // Final Report
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 FINAL REPORT')
  console.log('='.repeat(80))

  const passed = results.filter((r) => r.success).length
  const total = results.length

  console.log(`\nSUMMARY`)
  console.log(`-------`)
  console.log(`Total Tests: ${total}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${total - passed}`)
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)

  console.log(`\nDETAILED RESULTS`)
  console.log(`----------------`)

  results.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.scenario}`)
    console.log(`   Status: ${r.success ? '✅ PASSED' : '❌ FAILED'}`)
    if (r.fedexRatesFound !== undefined) {
      console.log(`   FedEx Rates: ${r.fedexRatesFound}/${r.expectedCount}`)
      if (r.serviceCodes) {
        console.log(`   Services: ${r.serviceCodes.join(', ')}`)
      }
      if (r.missingServices && r.missingServices.length > 0) {
        console.log(`   Missing: ${r.missingServices.join(', ')}`)
      }
    }
    if (r.error) {
      console.log(`   Error: ${r.error}`)
    }
  })

  console.log(`\nCONCLUSION`)
  console.log(`----------`)
  if (passed === total) {
    console.log(`✅ ALL TESTS PASSED - FedEx shipping is working correctly!`)
    console.log(`✅ Residential addresses get GROUND_HOME_DELIVERY`)
    console.log(`✅ Business addresses get FEDEX_GROUND`)
    console.log(`✅ All 4 shipping services available for both address types`)
  } else {
    console.log(`❌ SOME TESTS FAILED - Review details above`)
  }

  console.log('\n' + '='.repeat(80) + '\n')

  // Write JSON report
  const fs = require('fs')
  fs.writeFileSync(
    'fedex-api-test-report.json',
    JSON.stringify(
      {
        testDate: new Date().toISOString(),
        total,
        passed,
        failed: total - passed,
        results,
      },
      null,
      2
    )
  )

  console.log(`📁 Report saved: fedex-api-test-report.json\n`)

  process.exit(passed === total ? 0 : 1)
}

testShippingRates().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
