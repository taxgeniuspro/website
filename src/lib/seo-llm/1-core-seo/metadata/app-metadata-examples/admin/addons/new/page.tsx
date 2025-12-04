'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import toast from '@/lib/toast'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

export default function NewAddonPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tooltipText: '',
    pricingModel: 'FLAT',
    isActive: true,
    additionalTurnaroundDays: 0,
    sortOrder: 0,
    adminNotes: '',
    // Pricing configuration
    flatFee: 0,
    percentage: 0,
    perPieceRate: 0,
    baseFee: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.pricingModel) {
      toast.error('Please fill in required fields')
      return
    }

    setLoading(true)

    try {
      // Build configuration based on pricing model
      let configuration: any = {}

      switch (formData.pricingModel) {
        case 'FLAT':
          configuration = { flatFee: formData.flatFee }
          break
        case 'PERCENTAGE':
          configuration = { percentage: formData.percentage / 100, appliesTo: 'base_price' }
          break
        case 'PER_UNIT':
          configuration = { perPieceRate: formData.perPieceRate }
          break
        case 'CUSTOM':
          configuration = {
            baseFee: formData.baseFee,
            perPieceRate: formData.perPieceRate,
            formula: `$${formData.baseFee} + $${formData.perPieceRate}/piece`,
          }
          break
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
        tooltipText: formData.tooltipText || null,
        pricingModel: formData.pricingModel,
        configuration,
        additionalTurnaroundDays: formData.additionalTurnaroundDays,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        adminNotes: formData.adminNotes || null,
      }

      const response = await fetch('/api/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create addon')
      }

      toast.success('Addon created successfully!')
      router.push('/admin/addons')
    } catch (error) {
      toast.error((error as Error).message || 'Failed to create addon')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button size="sm" variant="ghost" onClick={() => router.push('/admin/addons')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Create New Addon</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Addon Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                id="name"
                placeholder="e.g., UV Coating"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Customer-facing description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Tooltip Text */}
            <div>
              <Label htmlFor="tooltipText">Tooltip Text</Label>
              <Input
                id="tooltipText"
                placeholder="Helpful hint for customers"
                value={formData.tooltipText}
                onChange={(e) => setFormData({ ...formData, tooltipText: e.target.value })}
              />
            </div>

            {/* Pricing Model */}
            <div>
              <Label htmlFor="pricingModel">
                Pricing Model <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.pricingModel}
                onValueChange={(value) => setFormData({ ...formData, pricingModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLAT">Flat Fee</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="PER_UNIT">Per Unit</SelectItem>
                  <SelectItem value="CUSTOM">Custom Formula</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pricing Configuration Based on Model */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">Pricing Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.pricingModel === 'FLAT' && (
                  <div>
                    <Label htmlFor="flatFee">Flat Fee ($)</Label>
                    <Input
                      id="flatFee"
                      min="0"
                      step="0.01"
                      type="number"
                      value={formData.flatFee}
                      onChange={(e) =>
                        setFormData({ ...formData, flatFee: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                )}

                {formData.pricingModel === 'PERCENTAGE' && (
                  <div>
                    <Label htmlFor="percentage">Percentage (%)</Label>
                    <Input
                      id="percentage"
                      max="100"
                      min="-100"
                      step="0.1"
                      type="number"
                      value={formData.percentage}
                      onChange={(e) =>
                        setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Negative values for discounts (e.g., -5 for 5% off)
                    </p>
                  </div>
                )}

                {formData.pricingModel === 'PER_UNIT' && (
                  <div>
                    <Label htmlFor="perPieceRate">Per Piece Rate ($)</Label>
                    <Input
                      id="perPieceRate"
                      min="0"
                      step="0.01"
                      type="number"
                      value={formData.perPieceRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          perPieceRate: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                )}

                {formData.pricingModel === 'CUSTOM' && (
                  <>
                    <div>
                      <Label htmlFor="baseFee">Base Fee ($)</Label>
                      <Input
                        id="baseFee"
                        min="0"
                        step="0.01"
                        type="number"
                        value={formData.baseFee}
                        onChange={(e) =>
                          setFormData({ ...formData, baseFee: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="customPerPiece">Per Piece Rate ($)</Label>
                      <Input
                        id="customPerPiece"
                        min="0"
                        step="0.01"
                        type="number"
                        value={formData.perPieceRate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            perPieceRate: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="text-sm bg-background p-3 rounded border">
                      <strong>Formula:</strong> ${formData.baseFee} + ${formData.perPieceRate} per
                      piece
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Additional Turnaround Days */}
            <div>
              <Label htmlFor="additionalTurnaroundDays">Additional Turnaround Days</Label>
              <Input
                id="additionalTurnaroundDays"
                min="0"
                type="number"
                value={formData.additionalTurnaroundDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    additionalTurnaroundDays: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            {/* Sort Order */}
            <div>
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                min="0"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            {/* Admin Notes */}
            <div>
              <Label htmlFor="adminNotes">Admin Notes (Internal Only)</Label>
              <Textarea
                id="adminNotes"
                placeholder="Internal notes for administrators"
                rows={3}
                value={formData.adminNotes}
                onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button disabled={loading} type="submit">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Addon
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
