'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Upload, CheckCircle, XCircle, Loader2, Image as ImageIcon } from 'lucide-react'
import toast from '@/lib/toast'

interface TestResult {
  name: string
  status: 'pending' | 'testing' | 'success' | 'failed'
  message?: string
  url?: string
}

export default function TestUploadPage() {
  const [testing, setTesting] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])

  const testMinioHealth = async () => {
    try {
      const response = await fetch('/api/test/minio-health')
      const data = await response.json()
      return {
        success: response.ok,
        message: data.message || (response.ok ? 'MinIO is healthy' : 'MinIO health check failed'),
        data,
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to check MinIO health',
      }
    }
  }

  const testImageUpload = async (file: File, productType?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('isPrimary', 'true')
    formData.append('sortOrder', '0')

    // Add product context for optimization profile testing
    if (productType) {
      formData.append('productName', productType)
      formData.append('categoryName', productType)
    }

    try {
      const response = await fetch('/api/products/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Extract optimization stats
      const metadata = data.metadata || {}
      const compressionRatio = metadata.compressionRatio || 1
      const savedPercentage = ((1 - compressionRatio) * 100).toFixed(1)
      const originalSizeKB = ((metadata.originalSize || 0) / 1024).toFixed(1)
      const optimizedSizeKB = ((metadata.size || 0) / 1024).toFixed(1)

      return {
        success: true,
        message: `Image optimized: ${originalSizeKB}KB → ${optimizedSizeKB}KB (${savedPercentage}% saved)`,
        url: data.optimized || data.url, // Use optimized version
        stats: {
          profile: metadata.profileUsed || 'UNKNOWN',
          originalSize: metadata.originalSize || 0,
          optimizedSize: metadata.size || 0,
          compressionRatio,
          savedPercentage,
          formats: {
            optimized: data.optimized,
            webp: data.webp,
            avif: data.avif,
            thumbnail: data.thumbnail,
          },
        },
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  const runTests = async () => {
    setTesting(true)
    setTestResults([])

    const tests: TestResult[] = [
      { name: 'MinIO Health Check', status: 'pending' },
      { name: 'Business Card (BUSINESS_CARD profile)', status: 'pending' },
      { name: 'Banner (BANNER profile)', status: 'pending' },
      { name: 'Flyer (FLYER profile)', status: 'pending' },
      { name: 'Premium Product (PREMIUM profile)', status: 'pending' },
      { name: 'Large Image Compression Test', status: 'pending' },
    ]

    setTestResults([...tests])

    // Test 1: MinIO Health
    tests[0].status = 'testing'
    setTestResults([...tests])

    const healthResult = await testMinioHealth()
    tests[0].status = healthResult.success ? 'success' : 'failed'
    tests[0].message = healthResult.message
    setTestResults([...tests])

    if (!healthResult.success) {
      setTesting(false)
      toast.error('MinIO health check failed. Cannot proceed with upload tests.')
      return
    }

    // Test 2: Business Card Profile
    tests[1].status = 'testing'
    setTestResults([...tests])

    const businessCard = await createTestImage('jpeg', 800, 600, 'Business Card Design')
    const bcResult = await testImageUpload(businessCard, 'business card')
    tests[1].status = bcResult.success ? 'success' : 'failed'
    tests[1].message = bcResult.message
    tests[1].url = bcResult.url
    setTestResults([...tests])

    if (bcResult.url) {
      setUploadedImageUrl(bcResult.url)
    }

    // Test 3: Banner Profile
    tests[2].status = 'testing'
    setTestResults([...tests])

    const banner = await createTestImage('png', 2000, 800, 'Large Format Banner')
    const bannerResult = await testImageUpload(banner, 'banner')
    tests[2].status = bannerResult.success ? 'success' : 'failed'
    tests[2].message = bannerResult.message
    tests[2].url = bannerResult.url
    setTestResults([...tests])

    // Test 4: Flyer Profile
    tests[3].status = 'testing'
    setTestResults([...tests])

    const flyer = await createTestImage('jpeg', 1200, 1600, 'Marketing Flyer')
    const flyerResult = await testImageUpload(flyer, 'flyer')
    tests[3].status = flyerResult.success ? 'success' : 'failed'
    tests[3].message = flyerResult.message
    tests[3].url = flyerResult.url
    setTestResults([...tests])

    // Test 5: Premium Profile
    tests[4].status = 'testing'
    setTestResults([...tests])

    const premium = await createTestImage('jpeg', 1500, 1500, 'Premium Product')
    const premiumResult = await testImageUpload(premium, 'premium')
    tests[4].status = premiumResult.success ? 'success' : 'failed'
    tests[4].message = premiumResult.message
    tests[4].url = premiumResult.url
    setTestResults([...tests])

    // Test 6: Large Image Compression
    tests[5].status = 'testing'
    setTestResults([...tests])

    const largeImage = await createTestImage('jpeg', 4000, 4000, 'Large Test Image')
    const largeResult = await testImageUpload(largeImage)
    tests[5].status = largeResult.success ? 'success' : 'failed'
    tests[5].message = largeResult.message
    tests[5].url = largeResult.url
    setTestResults([...tests])

    setTesting(false)

    // Show summary
    const successCount = tests.filter((t) => t.status === 'success').length
    if (successCount === tests.length) {
      toast.success('All tests passed!')
    } else {
      toast.error(`${tests.length - successCount} test(s) failed`)
    }
  }

  const createTestImage = async (
    type: 'jpeg' | 'png',
    width: number,
    height: number,
    label?: string
  ): Promise<File> => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#' + Math.floor(Math.random() * 16777215).toString(16))
    gradient.addColorStop(1, '#' + Math.floor(Math.random() * 16777215).toString(16))
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Add text
    ctx.fillStyle = 'white'
    ctx.font = `${Math.min(width, height) / 15}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (label) {
      ctx.fillText(label, width / 2, height / 2 - 30)
    }
    ctx.fillText(`${type.toUpperCase()} ${width}x${height}`, width / 2, height / 2)
    ctx.fillText(`${((width * height) / 1000000).toFixed(1)}MP`, width / 2, height / 2 + 30)

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          const file = new File(
            [blob!],
            `test-${label ? label.replace(/\s+/g, '-').toLowerCase() : 'image'}-${width}x${height}.${type}`,
            { type: `image/${type}` }
          )
          resolve(file)
        },
        `image/${type}`,
        0.9
      )
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setTesting(true)

    // Try to guess product type from filename
    const fileName = file.name.toLowerCase()
    let productType = ''
    if (fileName.includes('card')) productType = 'business card'
    else if (fileName.includes('banner') || fileName.includes('poster')) productType = 'banner'
    else if (fileName.includes('flyer')) productType = 'flyer'
    else if (fileName.includes('premium')) productType = 'premium'

    const result = await testImageUpload(file, productType)

    if (result.success) {
      toast.success(result.message || 'File uploaded successfully!')
      if (result.url) {
        setUploadedImageUrl(result.url)
      }
    } else {
      toast.error(result.message || 'Upload failed')
    }
    setTesting(false)

    // Reset input
    e.target.value = ''
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Image Upload Test</h1>
        <Button disabled={testing} size="lg" onClick={runTests}>
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {testResults.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {test.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full bg-gray-300" />
                  )}
                  {test.status === 'testing' && (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  )}
                  {test.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {test.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                  <div>
                    <p className="font-medium">{test.name}</p>
                    {test.message && (
                      <p className="text-sm text-muted-foreground">{test.message}</p>
                    )}
                  </div>
                </div>
                {test.url && (
                  <a
                    className="text-sm text-blue-500 hover:underline"
                    href={test.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View Image
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Manual Upload Test */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Upload Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                accept="image/*"
                className="hidden"
                disabled={testing}
                id="manual-upload"
                name="manualUpload"
                type="file"
                onChange={handleFileUpload}
              />
              <label
                className={`cursor-pointer ${testing ? 'opacity-50' : ''}`}
                htmlFor="manual-upload"
              >
                <Upload className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Click to upload an image</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Or drag and drop your file here
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported: JPEG, PNG, WebP, GIF • Max 10MB
                </p>
              </label>
            </div>

            {uploadedImageUrl && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Uploaded Image:</p>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-4">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{uploadedImageUrl}</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(uploadedImageUrl, '_blank')}
                        >
                          View Image
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(uploadedImageUrl)
                            toast.success('URL copied to clipboard')
                          }}
                        >
                          Copy URL
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert>
        <AlertTitle>Testing Instructions</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <p>This page tests the image upload functionality with various scenarios:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>MinIO storage connectivity and health</li>
            <li>Different image formats (JPEG, PNG, WebP, GIF)</li>
            <li>Various file sizes (small, medium, large)</li>
            <li>Image processing with Sharp library</li>
            <li>Error handling and validation</li>
          </ul>
          <p className="mt-2">
            Click "Run All Tests" to automatically test all scenarios, or use the manual upload to
            test specific files.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
