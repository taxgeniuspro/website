'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileText, Image, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import toast from '@/lib/toast'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  preview?: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  uploadedBytes?: number
  startTime?: number
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const calculateTimeRemaining = (file: UploadedFile): string => {
  if (!file.startTime || !file.uploadedBytes || file.uploadedBytes === 0) {
    return 'Calculating...'
  }

  const elapsedTime = (Date.now() - file.startTime) / 1000 // in seconds
  const uploadSpeed = file.uploadedBytes / elapsedTime // bytes per second
  const remainingBytes = file.size - file.uploadedBytes
  const remainingSeconds = remainingBytes / uploadSpeed

  if (remainingSeconds < 1) return 'Almost done...'
  if (remainingSeconds < 60) return `${Math.round(remainingSeconds)}s left`
  if (remainingSeconds < 3600) return `${Math.round(remainingSeconds / 60)}m left`
  return `${Math.round(remainingSeconds / 3600)}h left`
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      progress: 0,
      status: 'uploading' as const,
      uploadedBytes: 0,
      startTime: Date.now(),
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // Upload files to the API with real progress tracking
    newFiles.forEach(async (uploadFile, index) => {
      try {
        const file = Array.from(fileList)[index]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileType', 'design')

        // Use XMLHttpRequest to track upload progress
        const xhr = new XMLHttpRequest()

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100)
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? { ...f, progress: percentComplete, uploadedBytes: e.loaded }
                  : f
              )
            )
          }
        })

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText)
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id ? { ...f, progress: 100, status: 'completed' } : f
                )
              )
              toast.success(`${file.name} uploaded successfully!`)
            } catch (error) {
              setFiles((prev) =>
                prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'error' } : f))
              )
              toast.error(`Failed to upload ${file.name}: Invalid response`)
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText)
              setFiles((prev) =>
                prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'error' } : f))
              )
              toast.error(`Failed to upload ${file.name}: ${error.error || 'Unknown error'}`)
            } catch {
              setFiles((prev) =>
                prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'error' } : f))
              )
              toast.error(`Failed to upload ${file.name}: Server error`)
            }
          }
        })

        // Handle network errors
        xhr.addEventListener('error', () => {
          setFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'error' } : f))
          )
          toast.error(`Failed to upload ${uploadFile.name}: Network error`)
        })

        // Handle abort
        xhr.addEventListener('abort', () => {
          setFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'error' } : f))
          )
          toast.error(`Upload cancelled: ${uploadFile.name}`)
        })

        // Send the request
        xhr.open('POST', '/api/upload')
        xhr.send(formData)
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'error' } : f))
        )
        toast.error(`Failed to upload ${uploadFile.name}: Unexpected error`)
      }
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Upload your print files. We support PDF, PNG, JPG, and other common formats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
            }`}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.svg,.ai,.psd"
              className="hidden"
              name="customerUpload"
              type="file"
              onChange={handleFileInput}
            />

            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
            <p className="text-sm text-gray-500 mb-4">
              Support for PDF, JPG, PNG, SVG, AI, PSD (Max 100MB per file)
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>Select Files</Button>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {file.type.startsWith('image/') ? (
                    <Image className="w-8 h-8 text-blue-500" />
                  ) : (
                    <FileText className="w-8 h-8 text-gray-500" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{file.name}</p>
                      <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
                    </div>

                    {file.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">
                            {formatFileSize(file.uploadedBytes || 0)} / {formatFileSize(file.size)}{' '}
                            • {calculateTimeRemaining(file)}
                          </span>
                          <span className="text-xs font-medium text-primary">{file.progress}%</span>
                        </div>
                        <Progress className="h-2" value={file.progress} />
                      </div>
                    )}

                    {file.status === 'completed' && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Upload complete
                      </div>
                    )}

                    {file.status === 'error' && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <X className="w-4 h-4" />
                        Upload failed
                      </div>
                    )}
                  </div>

                  <Button size="sm" variant="ghost" onClick={() => removeFile(file.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
