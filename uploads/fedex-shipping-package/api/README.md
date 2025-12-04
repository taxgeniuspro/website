# FedEx Shipping API Integration Guide

This guide shows how to create API endpoints to use the FedEx provider in your Next.js application.

---

## 📍 API Endpoint Examples

### 1. Get Shipping Rates

**File:** `app/api/shipping/rates/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { FedExProviderEnhanced } from '@/lib/shipping/providers/fedex-provider'

// Initialize FedEx provider
const fedex = new FedExProviderEnhanced({
  clientId: process.env.FEDEX_API_KEY!,
  clientSecret: process.env.FEDEX_SECRET_KEY!,
  accountNumber: process.env.FEDEX_ACCOUNT_NUMBER!,
  testMode: process.env.FEDEX_TEST_MODE === 'true',
  useIntelligentPacking: true,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { destination, packages } = body

    // Origin address (your warehouse)
    const origin = {
      street: process.env.SHIPPING_ORIGIN_STREET || '1300 Basswood Road',
      city: process.env.SHIPPING_ORIGIN_CITY || 'Schaumburg',
      state: process.env.SHIPPING_ORIGIN_STATE || 'IL',
      zipCode: process.env.SHIPPING_ORIGIN_ZIP || '60173',
      country: process.env.SHIPPING_ORIGIN_COUNTRY || 'US',
      isResidential: false,
    }

    // Format packages
    const formattedPackages = packages.map((pkg: any) => ({
      weight: pkg.weight,
      dimensions: pkg.dimensions
        ? {
            length: pkg.dimensions.length,
            width: pkg.dimensions.width,
            height: pkg.dimensions.height,
          }
        : undefined,
      value: pkg.value || 100,
    }))

    // Get rates from FedEx
    const rates = await fedex.getRates(origin, destination, formattedPackages)

    return NextResponse.json({
      success: true,
      rates,
      carrier: 'FEDEX',
    })
  } catch (error: any) {
    console.error('FedEx rates error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get shipping rates',
      },
      { status: 500 }
    )
  }
}
```

---

### 2. Create Shipping Label

**File:** `app/api/shipping/label/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { FedExProviderEnhanced } from '@/lib/shipping/providers/fedex-provider'

const fedex = new FedExProviderEnhanced({
  clientId: process.env.FEDEX_API_KEY!,
  clientSecret: process.env.FEDEX_SECRET_KEY!,
  accountNumber: process.env.FEDEX_ACCOUNT_NUMBER!,
  testMode: process.env.FEDEX_TEST_MODE === 'true',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { origin, destination, packages, serviceCode } = body

    // Create label
    const label = await fedex.createLabel(origin, destination, packages, serviceCode)

    return NextResponse.json({
      success: true,
      label,
    })
  } catch (error: any) {
    console.error('FedEx label error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create shipping label',
      },
      { status: 500 }
    )
  }
}
```

---

### 3. Track Shipment

**File:** `app/api/shipping/track/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { FedExProviderEnhanced } from '@/lib/shipping/providers/fedex-provider'

const fedex = new FedExProviderEnhanced({
  clientId: process.env.FEDEX_API_KEY!,
  clientSecret: process.env.FEDEX_SECRET_KEY!,
  accountNumber: process.env.FEDEX_ACCOUNT_NUMBER!,
  testMode: process.env.FEDEX_TEST_MODE === 'true',
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingNumber = searchParams.get('tracking')

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: 'Tracking number required' },
        { status: 400 }
      )
    }

    // Track shipment
    const tracking = await fedex.track(trackingNumber)

    return NextResponse.json({
      success: true,
      tracking,
    })
  } catch (error: any) {
    console.error('FedEx tracking error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to track shipment',
      },
      { status: 500 }
    )
  }
}
```

---

## 🔌 Frontend Integration

### React Component Example

```typescript
'use client'

import { useState } from 'react'

export function ShippingRates() {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchRates = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: {
            street: '123 Main St',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90001',
            country: 'US',
            isResidential: true,
          },
          packages: [
            {
              weight: 5,
              dimensions: { length: 12, width: 9, height: 2 },
            },
          ],
        }),
      })

      const data = await response.json()
      if (data.success) {
        setRates(data.rates)
      }
    } catch (error) {
      console.error('Failed to get rates:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={fetchRates} disabled={loading}>
        {loading ? 'Loading...' : 'Get Shipping Rates'}
      </button>

      {rates.length > 0 && (
        <div>
          <h3>Available Shipping Options:</h3>
          {rates.map((rate: any) => (
            <div key={rate.serviceCode}>
              <strong>{rate.serviceName}</strong>
              <span>${rate.rateAmount.toFixed(2)}</span>
              <span>{rate.estimatedDays} days</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 📦 Request/Response Examples

### Get Rates Request

```json
POST /api/shipping/rates

{
  "destination": {
    "street": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90001",
    "country": "US",
    "isResidential": true
  },
  "packages": [
    {
      "weight": 5,
      "dimensions": {
        "length": 12,
        "width": 9,
        "height": 2
      },
      "value": 100
    }
  ]
}
```

### Get Rates Response

```json
{
  "success": true,
  "rates": [
    {
      "carrier": "FEDEX",
      "serviceCode": "SMART_POST",
      "serviceName": "FedEx Ground Economy",
      "rateAmount": 8.5,
      "currency": "USD",
      "estimatedDays": 5,
      "isGuaranteed": false
    },
    {
      "carrier": "FEDEX",
      "serviceCode": "GROUND_HOME_DELIVERY",
      "serviceName": "FedEx Home Delivery",
      "rateAmount": 12.75,
      "currency": "USD",
      "estimatedDays": 3,
      "isGuaranteed": false
    },
    {
      "carrier": "FEDEX",
      "serviceCode": "FEDEX_2_DAY",
      "serviceName": "FedEx 2Day",
      "rateAmount": 28.5,
      "currency": "USD",
      "estimatedDays": 2,
      "isGuaranteed": true
    },
    {
      "carrier": "FEDEX",
      "serviceCode": "STANDARD_OVERNIGHT",
      "serviceName": "FedEx Standard Overnight",
      "rateAmount": 52.0,
      "currency": "USD",
      "estimatedDays": 1,
      "isGuaranteed": false
    }
  ],
  "carrier": "FEDEX"
}
```

---

## 🎯 Next Steps

1. Copy API routes to your `app/api` directory
2. Update environment variables in `.env`
3. Test with included test script: `node tests/test-fedex-api-direct.js`
4. Integrate with your checkout flow
5. Add error handling and logging

---

## 🔒 Security Notes

- ✅ Always validate input data (addresses, package dimensions)
- ✅ Rate limit API endpoints to prevent abuse
- ✅ Log all API calls for debugging
- ✅ Never expose API credentials to frontend
- ✅ Use HTTPS in production

---

## 📞 Troubleshooting

### "Authentication Failed"
- Check API credentials in `.env`
- Verify `FEDEX_TEST_MODE` matches your credentials (sandbox vs production)

### "Invalid Address"
- Ensure all required address fields are provided
- Use FedEx address validation before getting rates

### "No Rates Returned"
- Check package weight/dimensions are valid
- Verify origin and destination are in supported areas
- Try test mode first to isolate issues

---

**Need help? See main README.md or FedEx documentation.**
