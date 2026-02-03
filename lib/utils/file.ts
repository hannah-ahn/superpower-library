import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  FILENAME_MAX_LENGTH,
  FILENAME_PATTERN,
  getFileType,
} from '@/types/database'

export interface FileValidationResult {
  valid: boolean
  error?: string
}

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 3GB.',
    }
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Only images and PDFs are supported.',
    }
  }

  return { valid: true }
}

export function sanitizeFilename(name: string): string {
  // Remove extension
  const lastDot = name.lastIndexOf('.')
  const baseName = lastDot > 0 ? name.substring(0, lastDot) : name
  const extension = lastDot > 0 ? name.substring(lastDot) : ''

  // Sanitize base name
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100) || 'untitled'

  return sanitized + extension
}

export function validateFilename(filename: string): FileValidationResult {
  if (!filename || filename.trim().length === 0) {
    return {
      valid: false,
      error: 'Filename cannot be empty.',
    }
  }

  if (filename.length > FILENAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Filename cannot exceed ${FILENAME_MAX_LENGTH} characters.`,
    }
  }

  // Extract name without extension for validation
  const lastDot = filename.lastIndexOf('.')
  const baseName = lastDot > 0 ? filename.substring(0, lastDot) : filename

  if (!FILENAME_PATTERN.test(baseName)) {
    return {
      valid: false,
      error: 'Filename contains invalid characters.',
    }
  }

  return { valid: true }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`
}

export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : ''
}

export function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
  }

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream'
}

export { getFileType }
