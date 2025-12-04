import { NextResponse } from 'next/server'

export async function GET(): Promise<unknown> {
  try {
    // Return mock data in the format the frontend expects
    const mockData = [
      {
        id: '1',
        name: '12pt Card Stock',
        basePrice: 0.00001234,
        shippingWeight: 0.5,
        isActive: true,
        coatings: [
          { id: 'high-gloss-uv', label: 'High Gloss UV', enabled: true },
          { id: 'matte-aqueous', label: 'Matte Aqueous', enabled: true },
        ],
        sidesOptions: [
          {
            id: 'same-image-both',
            label: 'Same image, both sides',
            enabled: true,
            multiplier: 1.0,
          },
          {
            id: 'different-image-both',
            label: 'Different image, both sides',
            enabled: true,
            multiplier: 1.0,
          },
          { id: 'image-one-side', label: 'Image one side only', enabled: true, multiplier: 1.0 },
        ],
        defaultCoating: 'high-gloss-uv',
        defaultSides: 'same-image-both',
        productsCount: 0,
      },
      {
        id: '2',
        name: '100lb Text Paper',
        basePrice: 0.00001,
        shippingWeight: 0.4,
        isActive: true,
        coatings: [{ id: 'matte-aqueous', label: 'Matte Aqueous', enabled: true }],
        sidesOptions: [
          {
            id: 'different-image-both',
            label: 'Different image, both sides',
            enabled: true,
            multiplier: 1.75,
          },
          { id: 'image-one-side', label: 'Image one side only', enabled: true, multiplier: 1.0 },
        ],
        defaultCoating: 'matte-aqueous',
        defaultSides: 'image-one-side',
        productsCount: 0,
      },
    ]

    return NextResponse.json(mockData)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch paper stocks' }, { status: 500 })
  }
}
