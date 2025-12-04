'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, Loader2, Sparkles } from 'lucide-react'
import toast from '@/lib/toast'

interface ConfigOption {
  id: string
  name: string
}

export default function NewLandingPageSetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Configuration options
  const [paperStockSets, setPaperStockSets] = useState<ConfigOption[]>([])
  const [quantityGroups, setQuantityGroups] = useState<ConfigOption[]>([])
  const [sizeGroups, setSizeGroups] = useState<ConfigOption[]>([])
  const [addOnSets, setAddOnSets] = useState<ConfigOption[]>([])
  const [turnaroundTimeSets, setTurnaroundTimeSets] = useState<ConfigOption[]>([])

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    paperStockSetId: '',
    quantityGroupId: '',
    sizeGroupId: '',
    addOnSetId: '',
    turnaroundTimeSetId: '',
    titleTemplate: 'Professional [PRODUCT] Printing in [CITY], [STATE] | GangRun Printing',
    metaDescTemplate:
      'Order premium [PRODUCT] in [CITY], [STATE]. Fast printing, [POPULATION_FORMATTED] satisfied customers. Free shipping on orders over $50.',
    h1Template: 'Professional [PRODUCT] Printing in [CITY], [STATE]',
    contentTemplate:
      'Welcome to professional [PRODUCT] printing services in [CITY], [STATE]. Serving [POPULATION_FORMATTED] residents across [NEIGHBORHOODS].',
    generateIntro: true,
    generateBenefits: true,
    generateFAQs: true,
    generateCaseStudy: false,
    robotsIndex: true,
    robotsFollow: true,
    urgencyEnabled: true,
    discountEnabled: false,
    discountPercent: 0,
    chatWidgetEnabled: true,
  })

  useEffect(() => {
    fetchConfiguration()
  }, [])

  const fetchConfiguration = async () => {
    try {
      setLoadingConfig(true)
      const [paperRes, qtyRes, sizeRes, addonRes, timeRes] = await Promise.all([
        fetch('/api/paper-stock-sets?isActive=true'),
        fetch('/api/quantity-groups?isActive=true'),
        fetch('/api/size-groups?isActive=true'),
        fetch('/api/addon-sets?isActive=true'),
        fetch('/api/turnaround-time-sets?isActive=true'),
      ])

      if (paperRes.ok) setPaperStockSets(await paperRes.json())
      if (qtyRes.ok) setQuantityGroups(await qtyRes.json())
      if (sizeRes.ok) setSizeGroups(await sizeRes.json())
      if (addonRes.ok) setAddOnSets(await addonRes.json())
      if (timeRes.ok) setTurnaroundTimeSets(await timeRes.json())
    } catch (error) {
      console.error('Error fetching configuration:', error)
      toast.error('Failed to load product configuration')
    } finally {
      setLoadingConfig(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (
      !formData.name ||
      !formData.paperStockSetId ||
      !formData.quantityGroupId ||
      !formData.sizeGroupId
    ) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/landing-page-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create landing page set')
      }

      const result = await response.json()
      toast.success('Landing page set created successfully!')
      router.push(`/admin/landing-pages/${result.id}`)
    } catch (error) {
      console.error('Error creating landing page set:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create landing page set')
    } finally {
      setLoading(false)
    }
  }

  const insertVariable = (
    field: 'titleTemplate' | 'metaDescTemplate' | 'h1Template' | 'contentTemplate',
    variable: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field] + ` ${variable}`,
    }))
  }

  const variables = [
    '[CITY]',
    '[STATE]',
    '[STATE_CODE]',
    '[POPULATION_FORMATTED]',
    '[NEIGHBORHOODS]',
    '[LANDMARK]',
    '[EVENT]',
    '[BUSINESS_COUNT]',
  ]

  if (loadingConfig) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    )
  }

  return (
    <form className="container mx-auto py-6 max-w-4xl" onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => router.push('/admin/landing-pages')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Create Landing Page Set</h1>
        </div>
        <Button disabled={loading} type="submit">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Draft
        </Button>
      </div>

      {/* Basic Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Name your landing page campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              required
              id="name"
              placeholder="e.g., Postcards 4x6 Landing Pages"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <p className="text-sm text-gray-500 mt-1">
              This will be used to create the product name for each city
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Product Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Product Configuration</CardTitle>
          <CardDescription>
            Select existing product options (shared across all 200 cities)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="paperStockSetId">Paper Stock Set *</Label>
            <Select
              value={formData.paperStockSetId}
              onValueChange={(value) => setFormData({ ...formData, paperStockSetId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select paper stock set" />
              </SelectTrigger>
              <SelectContent>
                {paperStockSets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantityGroupId">Quantity Group *</Label>
            <Select
              value={formData.quantityGroupId}
              onValueChange={(value) => setFormData({ ...formData, quantityGroupId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quantity group" />
              </SelectTrigger>
              <SelectContent>
                {quantityGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sizeGroupId">Size Group *</Label>
            <Select
              value={formData.sizeGroupId}
              onValueChange={(value) => setFormData({ ...formData, sizeGroupId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size group" />
              </SelectTrigger>
              <SelectContent>
                {sizeGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="addOnSetId">Add-on Set (Optional)</Label>
            <Select
              value={formData.addOnSetId}
              onValueChange={(value) => setFormData({ ...formData, addOnSetId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select add-on set (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None - No add-ons</SelectItem>
                {addOnSets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="turnaroundTimeSetId">Turnaround Time Set (Optional)</Label>
            <Select
              value={formData.turnaroundTimeSetId}
              onValueChange={(value) => setFormData({ ...formData, turnaroundTimeSetId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select turnaround time set (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None - No turnaround options</SelectItem>
                {turnaroundTimeSets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Templates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Content Templates</CardTitle>
          <CardDescription>Use variables to customize content for each city</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Variables helper */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm font-medium text-blue-900 mb-2">Available Variables:</p>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <code
                  key={variable}
                  className="text-xs bg-white px-2 py-1 rounded border border-blue-300"
                >
                  {variable}
                </code>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="titleTemplate">Page Title Template *</Label>
            <Input
              required
              id="titleTemplate"
              value={formData.titleTemplate}
              onChange={(e) => setFormData({ ...formData, titleTemplate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="metaDescTemplate">Meta Description Template *</Label>
            <Textarea
              required
              id="metaDescTemplate"
              rows={2}
              value={formData.metaDescTemplate}
              onChange={(e) => setFormData({ ...formData, metaDescTemplate: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="h1Template">H1 Heading Template *</Label>
            <Input
              required
              id="h1Template"
              value={formData.h1Template}
              onChange={(e) => setFormData({ ...formData, h1Template: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="contentTemplate">Content Template *</Label>
            <Textarea
              required
              id="contentTemplate"
              rows={4}
              value={formData.contentTemplate}
              onChange={(e) => setFormData({ ...formData, contentTemplate: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Generation Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Content Generation
          </CardTitle>
          <CardDescription>Enable AI to generate unique content for each city</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.generateIntro}
              id="generateIntro"
              onCheckedChange={(checked) =>
                setFormData({ ...formData, generateIntro: checked as boolean })
              }
            />
            <Label htmlFor="generateIntro">Generate unique introduction (200 words per city)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.generateBenefits}
              id="generateBenefits"
              onCheckedChange={(checked) =>
                setFormData({ ...formData, generateBenefits: checked as boolean })
              }
            />
            <Label htmlFor="generateBenefits">Generate benefits section</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.generateFAQs}
              id="generateFAQs"
              onCheckedChange={(checked) =>
                setFormData({ ...formData, generateFAQs: checked as boolean })
              }
            />
            <Label htmlFor="generateFAQs">Generate city-specific FAQs (5 questions)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.generateCaseStudy}
              id="generateCaseStudy"
              onCheckedChange={(checked) =>
                setFormData({ ...formData, generateCaseStudy: checked as boolean })
              }
            />
            <Label htmlFor="generateCaseStudy">Generate case studies (optional)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/landing-pages')}>
          Cancel
        </Button>
        <Button disabled={loading} type="submit">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Create Landing Page Set
        </Button>
      </div>
    </form>
  )
}
