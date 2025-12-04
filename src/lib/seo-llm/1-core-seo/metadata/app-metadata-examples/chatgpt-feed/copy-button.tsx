'use client'

import { Button } from '@/components/ui/button'
import { Check, Copy, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface CopyButtonProps {
  text: string
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  const handleCopy = async () => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available (HTTPS required)')
      }

      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      setError(true)
      toast.error(
        err instanceof Error ? err.message : 'Failed to copy to clipboard. Please copy manually.'
      )
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <Button
      aria-label={copied ? 'Copied to clipboard' : error ? 'Copy failed' : 'Copy URL to clipboard'}
      size="icon"
      title={copied ? 'Copied!' : error ? 'Failed to copy' : 'Copy URL'}
      variant="outline"
      onClick={handleCopy}
    >
      {copied ? (
        <Check aria-hidden="true" className="h-4 w-4 text-green-600" />
      ) : error ? (
        <X aria-hidden="true" className="h-4 w-4 text-red-600" />
      ) : (
        <Copy aria-hidden="true" className="h-4 w-4" />
      )}
    </Button>
  )
}
