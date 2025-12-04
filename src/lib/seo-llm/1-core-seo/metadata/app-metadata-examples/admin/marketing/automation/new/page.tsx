'use client'

import { useRouter } from 'next/navigation'
import { WorkflowDesigner } from '@/components/marketing/workflow-designer'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewWorkflowPage() {
  const router = useRouter()

  const handleSave = async (workflow: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/marketing/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow),
      })

      if (response.ok) {
        router.push('/admin/marketing/automation')
      }
    } catch (error) {}
  }

  const handlePreview = (workflow: Record<string, unknown>) => {
    // Implement preview functionality
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div>
          <h1 className="text-xl font-semibold">Create New Workflow</h1>
          <p className="text-sm text-gray-600">Design an automated marketing workflow</p>
        </div>
      </div>

      {/* Workflow Designer */}
      <div className="flex-1">
        <WorkflowDesigner onPreview={handlePreview} onSave={handleSave} />
      </div>
    </div>
  )
}
