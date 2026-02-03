export type FileType = 'image' | 'pdf'
export type ProcessingStatus = 'pending' | 'complete' | 'failed'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  created_at: string
}

export interface Asset {
  id: string
  uploaded_by: string
  filename: string
  original_filename: string
  file_type: FileType
  mime_type: string
  file_size: number
  storage_path: string
  thumbnail_path: string | null
  ai_summary: string | null
  ai_tags: string[]
  extracted_text: string | null
  user_tags: string[]
  processing_status: ProcessingStatus
  download_count: number
  created_at: string
  updated_at: string
}

export interface AssetWithDetails extends Asset {
  url: string
  thumbnail_url: string | null
  uploader: Profile
}

export interface Download {
  id: string
  asset_id: string
  downloaded_by: string
  downloaded_at: string
}

export interface DownloadWithUser extends Download {
  user: Profile
}

export interface InviteLink {
  id: string
  created_by: string
  code: string
  created_at: string
  expires_at: string | null
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ApiError {
  error: string
  code?: string
}

// Search types
export interface SearchResult {
  assets: AssetWithDetails[]
  total: number
  query: string
}

// Upload types
export interface UploadProgress {
  filename: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
}

// Form validation
export const FILENAME_MAX_LENGTH = 255
export const FILENAME_PATTERN = /^[a-zA-Z0-9-_. ]+$/
export const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024 // 3GB
export const MAX_BULK_UPLOAD = 40
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]
export const ALLOWED_PDF_TYPES = ['application/pdf']
export const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES]

export function isValidFilename(filename: string): boolean {
  if (!filename || filename.trim().length === 0) return false
  if (filename.length > FILENAME_MAX_LENGTH) return false
  return FILENAME_PATTERN.test(filename)
}

export function getFileType(mimeType: string): FileType | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image'
  if (ALLOWED_PDF_TYPES.includes(mimeType)) return 'pdf'
  return null
}
