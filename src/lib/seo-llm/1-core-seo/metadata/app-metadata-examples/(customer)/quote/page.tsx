'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Send,
  CheckCircle,
  Phone,
  Users,
  MapPin,
  ArrowRight,
  Upload,
  FileText,
  Calculator,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

export default function QuotePage() {
  const [formData, setFormData] = useState({
    department: '',
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    projectType: '',
    quantity: '',
    size: '',
    paperType: '',
    turnaround: 'standard',
    finishing: [] as string[],
    message: '',
    files: [] as File[],
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const departments = [
    { value: 'sales', label: 'Sales - New Projects' },
    { value: 'reorder', label: 'Reorder - Existing Projects' },
    { value: 'design', label: 'Design Services' },
    { value: 'gangrun', label: 'Gang Run Printing' },
    { value: 'largeformat', label: 'Large Format Printing' },
    { value: 'packaging', label: 'Packaging & Labels' },
    { value: 'support', label: 'Customer Support' },
  ]

  const projectTypes = [
    'Business Cards',
    'Flyers/Brochures',
    'Postcards',
    'Booklets/Catalogs',
    'Banners',
    'Posters',
    'Stickers/Labels',
    'Packaging',
    'Other',
  ]

  const finishingOptions = [
    { id: 'gloss', label: 'Gloss Coating' },
    { id: 'matte', label: 'Matte Coating' },
    { id: 'uv', label: 'UV Coating' },
    { id: 'foil', label: 'Foil Stamping' },
    { id: 'emboss', label: 'Embossing' },
    { id: 'die', label: 'Die Cutting' },
    { id: 'perforation', label: 'Perforation' },
    { id: 'binding', label: 'Binding' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setSubmitted(true)
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleFinishingChange = (optionId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      finishing: checked
        ? [...prev.finishing, optionId]
        : prev.finishing.filter((id) => id !== optionId),
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData((prev) => ({
        ...prev,
        files: Array.from(e.target.files!),
      }))
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-24">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Quote Request Received!</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Thank you for your interest in Gang Run Printing. Our team will review your
                  request and get back to you within 2-4 business hours with a detailed quote.
                </p>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Quote Reference:{' '}
                    <span className="font-mono font-bold">
                      GRP-{Date.now().toString(36).toUpperCase()}
                    </span>
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button asChild>
                      <Link href="/products">Browse Products</Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSubmitted(false)
                        setFormData({
                          department: '',
                          firstName: '',
                          lastName: '',
                          company: '',
                          email: '',
                          phone: '',
                          projectType: '',
                          quantity: '',
                          size: '',
                          paperType: '',
                          turnaround: 'standard',
                          finishing: [],
                          message: '',
                          files: [],
                        })
                      }}
                    >
                      Submit Another Quote
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Get a Custom Quote</h1>
            <p className="text-lg md:text-xl opacity-90">
              Professional printing solutions tailored to your needs. Get competitive pricing in
              minutes.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <Phone className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Call Today</CardTitle>
              <CardDescription>877-M13-1913</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full" size="sm" variant="outline">
                <Phone className="mr-2 h-4 w-4" />
                Call Now
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Returning Customer?</CardTitle>
              <CardDescription>Fast reorder process</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild className="w-full" size="sm" variant="outline">
                <Link href="/auth/signin">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Login
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Visit Us</CardTitle>
              <CardDescription>Multiple locations</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild className="w-full" size="sm" variant="outline">
                <Link href="/contact">
                  <MapPin className="mr-2 h-4 w-4" />
                  Locations & Hours
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quote Form */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Quote Request Form</CardTitle>
            <CardDescription>
              Fill out the form below with your project details and we'll provide a custom quote
              within 2-4 business hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-8" onSubmit={handleSubmit}>
              {/* Department Selection */}
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select One --" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      required
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      required
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      required
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      required
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Project Details</h3>

                <div>
                  <Label htmlFor="projectType">Project Type *</Label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, projectType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      required
                      id="quantity"
                      name="quantity"
                      placeholder="e.g., 500"
                      type="number"
                      value={formData.quantity}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="size">Size/Dimensions</Label>
                    <Input
                      id="size"
                      name="size"
                      placeholder="e.g., 8.5 x 11"
                      value={formData.size}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="paperType">Paper Type</Label>
                    <Input
                      id="paperType"
                      name="paperType"
                      placeholder="e.g., 100lb Gloss"
                      value={formData.paperType}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Turnaround Time */}
                <div>
                  <Label>Turnaround Time</Label>
                  <RadioGroup
                    value={formData.turnaround}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, turnaround: value }))
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="standard" value="standard" />
                      <Label htmlFor="standard">Standard (5-7 business days)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem id="rush" value="rush" />
                      <Label className="flex items-center gap-2" htmlFor="rush">
                        <Zap className="h-4 w-4 text-orange-500" />
                        Rush (1-3 business days) - Additional fees apply
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Finishing Options */}
                <div>
                  <Label>Finishing Options</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {finishingOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={formData.finishing.includes(option.id)}
                          id={option.id}
                          onCheckedChange={(checked) =>
                            handleFinishingChange(option.id, checked as boolean)
                          }
                        />
                        <Label className="text-sm font-normal" htmlFor={option.id}>
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="files">Upload Files (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <Label className="cursor-pointer" htmlFor="files">
                    <span className="text-primary hover:underline">Click to upload</span> or drag
                    and drop
                  </Label>
                  <Input
                    multiple
                    accept=".pdf,.ai,.psd,.jpg,.jpeg,.png,.eps"
                    className="hidden"
                    id="files"
                    name="files"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    PDF, AI, PSD, JPG, PNG, EPS (Max 25MB per file)
                  </p>
                  {formData.files.length > 0 && (
                    <div className="mt-4 text-left">
                      <p className="text-sm font-medium mb-2">Selected files:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {formData.files.map((file, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {file.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <Label htmlFor="message">Project Details / Special Requirements</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Please provide any additional details about your project, including special requirements, color preferences, or questions you may have..."
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <Calculator className="inline-block h-4 w-4 mr-1" />
                  Estimated response time: 2-4 business hours
                </div>
                <Button
                  disabled={
                    loading ||
                    !formData.department ||
                    !formData.firstName ||
                    !formData.lastName ||
                    !formData.email ||
                    !formData.phone ||
                    !formData.projectType ||
                    !formData.quantity
                  }
                  size="lg"
                  type="submit"
                >
                  {loading ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Quote Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Turnaround</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Need it fast? We offer rush printing services with same-day and next-day options
                available for most products.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Competitive Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gang run printing allows us to offer premium quality at wholesale prices. Volume
                discounts available.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expert Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our print specialists are here to help optimize your files and ensure the best
                results for your project.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
