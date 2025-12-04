'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

export default function APIDocsPage() {
  const [spec, setSpec] = useState(null)

  useEffect(() => {
    // Load the OpenAPI spec
    fetch('/api/openapi.json')
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((error) => console.error('Failed to load API spec:', error))
  }, [])

  if (!spec) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading API Documentation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">🚀 GangRun Printing API Documentation</h1>
          <p className="text-muted-foreground mt-2">
            Interactive API reference • Test endpoints directly from your browser
          </p>
        </div>
      </div>

      {/* Swagger UI */}
      <div className="container mx-auto px-4 py-8">
        <SwaggerUI spec={spec} />
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            💡 <strong>Tip:</strong> Use the "Try it out" button to test API endpoints directly from
            this page
          </p>
          <p className="mt-2">
            📚 For more information, visit{' '}
            <a href="/help-center" className="text-primary hover:underline">
              Help Center
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
