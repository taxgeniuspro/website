/**
 * City Data Types for SEO Brain
 */

export interface CityData {
  id: string
  name: string
  state: string
  slug: string
  population?: number
  zipCodes?: string[]
  neighborhoods?: string[]
  venues?: string[]
  industries?: string[]
  famousFor?: string[]
  landmarks?: string[]
}

export interface ProductCampaignQueue {
  id: string
  productName: string
  productSpec: ProductSpec
  status: 'PENDING' | 'GENERATING' | 'OPTIMIZING' | 'COMPLETED' | 'FAILED'
  priority: number
  citiesGenerated: number
  citiesIndexed: number
  generationStartedAt?: Date
  generationCompletedAt?: Date
  optimizationStartedAt?: Date
  optimizationCompletedAt?: Date
  metrics?: CampaignMetrics
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface ProductSpec {
  quantity: number
  size: string
  material: string
  turnaround: string
  price: number
  onlineOnly: boolean
  keywords: string[]
  industries?: string[]
}

export interface CampaignMetrics {
  totalViews: number
  totalConversions: number
  totalRevenue: number
  topCities: string[]
  avgRank: number
  avgConversionRate: number
}
