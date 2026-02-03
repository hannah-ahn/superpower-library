'use client'

import { useState, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { cn } from '@/lib/utils'
import { Upload, X, FileText, ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { validateFile, formatFileSize } from '@/lib/utils/file'
import { MAX_BULK_UPLOAD, ALLOWED_FILE_TYPES } from '@/types/database'

interface FileWithPreview {
  file: File
  id: string
  preview?: string
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  error?: string
}

interface AssetUploadProps {
  onUpload: (files: File[]) => Promise<void>
  disabled?: boolean
}

export function AssetUpload({ onUpload, disabled }: AssetUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const processFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return

    const newFiles: FileWithPreview[] = []
    const errors: string[] = []

    // Check bulk limit
    if (fileList.length > MAX_BULK_UPLOAD) {
      errors.push(`Maximum ${MAX_BULK_UPLOAD} files per upload. Please upload in batches.`)
      return { files: [], errors }
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const validation = validateFile(file)

      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`)
        continue
      }

      const id = Math.random().toString(36).substring(7)
      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined

      newFiles.push({
        file,
        id,
        preview,
        status: 'queued',
        progress: 0,
      })
    }

    return { files: newFiles, errors }
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled || uploading) return

      const result = processFiles(e.dataTransfer.files)
      if (result) {
        setFiles((prev) => [...prev, ...result.files])
      }
    },
    [disabled, uploading, processFiles]
  )

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (disabled || uploading) return

      const result = processFiles(e.target.files)
      if (result) {
        setFiles((prev) => [...prev, ...result.files])
      }

      // Reset input
      e.target.value = ''
    },
    [disabled, uploading, processFiles]
  )

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)

    try {
      await onUpload(files.map((f) => f.file))

      // Clear files and revoke URLs
      files.forEach((f) => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview)
        }
      })
      setFiles([])
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const clearAll = () => {
    files.forEach((f) => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview)
      }
    })
    setFiles([])
  }

  const accept = ALLOWED_FILE_TYPES.join(',')

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 transition-colors',
          isDragging
            ? 'border-accent bg-accent-light'
            : 'border-gray-200 hover:border-gray-300',
          (disabled || uploading) && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled || uploading}
        />

        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center mb-4',
              isDragging ? 'bg-accent text-white' : 'bg-gray-100 text-gray-400'
            )}
          >
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-body-sm font-medium text-gray-900 mb-1">
            {isDragging ? 'Drop files here' : 'Drag and drop files'}
          </p>
          <p className="text-caption text-gray-500">
            or click to browse • Images and PDFs up to 3GB
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-gray-600">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearAll}
              className="text-body-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 scrollbar-thin">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {/* Preview */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.file.type === 'application/pdf' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-gray-900 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-caption text-gray-500">
                    {formatFileSize(file.file.size)}
                  </p>
                </div>

                {/* Status/Remove */}
                {file.status === 'uploading' ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : file.status === 'error' ? (
                  <span className="text-caption text-error">{file.error}</span>
                ) : (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            loading={uploading}
            disabled={files.length === 0}
            className="w-full"
          >
            Upload {files.length} file{files.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  )
}
