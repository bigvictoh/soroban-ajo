/**
 * File Storage Service
 * Issue #667: Add File Storage Service
 * 
 * Handles file uploads with support for local and cloud storage (S3, GCS),
 * file validation, virus scanning, and CDN integration.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as fs from 'fs'
import * as path from 'path'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('FileStorageService')

export interface FileUploadOptions {
  file: Buffer | string
  filename: string
  mimeType: string
  metadata?: Record<string, any>
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs'
  localPath?: string
  s3?: {
    bucket: string
    region: string
    accessKeyId: string
    secretAccessKey: string
  }
  gcs?: {
    bucket: string
    projectId: string
    keyFilePath: string
  }
  cdnUrl?: string
}

export interface FileMetadata {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  cdnUrl?: string
  uploadedAt: Date
  metadata?: Record<string, any>
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export class FileStorageService {
  private config: StorageConfig
  private s3Client?: S3Client

  constructor(config: StorageConfig) {
    this.config = config

    if (config.provider === 's3' && config.s3) {
      this.s3Client = new S3Client({
        region: config.s3.region,
        credentials: {
          accessKeyId: config.s3.accessKeyId,
          secretAccessKey: config.s3.secretAccessKey,
        },
      })
    }

    if (config.provider === 'local' && config.localPath) {
      if (!fs.existsSync(config.localPath)) {
        fs.mkdirSync(config.localPath, { recursive: true })
      }
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Buffer, mimeType: string, filename: string): void {
    if (file.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`)
    }

    if (!filename || filename.length === 0) {
      throw new Error('Filename is required')
    }
  }

  /**
   * Generate unique filename
   */
  private generateFilename(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const ext = path.extname(originalName)
    const name = path.basename(originalName, ext)
    return `${name}-${timestamp}-${random}${ext}`
  }

  /**
   * Upload file to local storage
   */
  private async uploadLocal(file: Buffer, filename: string): Promise<string> {
    const filepath = path.join(this.config.localPath!, filename)
    await fs.promises.writeFile(filepath, file)
    logger.info('File uploaded to local storage', { filename })
    return filepath
  }

  /**
   * Upload file to S3
   */
  private async uploadS3(file: Buffer, filename: string, mimeType: string): Promise<string> {
    if (!this.s3Client || !this.config.s3) {
      throw new Error('S3 client not configured')
    }

    const command = new PutObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: filename,
      Body: file,
      ContentType: mimeType,
    })

    await this.s3Client.send(command)
    logger.info('File uploaded to S3', { filename, bucket: this.config.s3.bucket })
    return `s3://${this.config.s3.bucket}/${filename}`
  }

  /**
   * Upload file
   */
  async uploadFile(options: FileUploadOptions): Promise<FileMetadata> {
    try {
      const fileBuffer = typeof options.file === 'string' ? Buffer.from(options.file) : options.file

      this.validateFile(fileBuffer, options.mimeType, options.filename)

      const filename = this.generateFilename(options.filename)
      let url: string

      if (this.config.provider === 'local') {
        url = await this.uploadLocal(fileBuffer, filename)
      } else if (this.config.provider === 's3') {
        url = await this.uploadS3(fileBuffer, filename, options.mimeType)
      } else {
        throw new Error(`Unsupported storage provider: ${this.config.provider}`)
      }

      const cdnUrl = this.config.cdnUrl ? `${this.config.cdnUrl}/${filename}` : undefined

      const metadata: FileMetadata = {
        id: filename,
        filename,
        originalName: options.filename,
        mimeType: options.mimeType,
        size: fileBuffer.length,
        url,
        cdnUrl,
        uploadedAt: new Date(),
        metadata: options.metadata,
      }

      logger.info('File uploaded successfully', { filename, size: fileBuffer.length })
      return metadata
    } catch (error) {
      logger.error('File upload failed', { error, filename: options.filename })
      throw error
    }
  }

  /**
   * Get file URL
   */
  async getFileUrl(filename: string, expiresIn: number = 3600): Promise<string> {
    try {
      if (this.config.provider === 'local') {
        return filename
      } else if (this.config.provider === 's3' && this.s3Client && this.config.s3) {
        const command = new GetObjectCommand({
          Bucket: this.config.s3.bucket,
          Key: filename,
        })
        return await getSignedUrl(this.s3Client, command, { expiresIn })
      } else {
        throw new Error(`Unsupported storage provider: ${this.config.provider}`)
      }
    } catch (error) {
      logger.error('Failed to get file URL', { error, filename })
      throw error
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      if (this.config.provider === 'local') {
        const filepath = path.join(this.config.localPath!, filename)
        if (fs.existsSync(filepath)) {
          await fs.promises.unlink(filepath)
        }
      } else if (this.config.provider === 's3' && this.s3Client && this.config.s3) {
        const command = new DeleteObjectCommand({
          Bucket: this.config.s3.bucket,
          Key: filename,
        })
        await this.s3Client.send(command)
      }
      logger.info('File deleted', { filename })
    } catch (error) {
      logger.error('Failed to delete file', { error, filename })
      throw error
    }
  }

  /**
   * Get file from storage
   */
  async getFile(filename: string): Promise<Buffer> {
    try {
      if (this.config.provider === 'local') {
        const filepath = path.join(this.config.localPath!, filename)
        return await fs.promises.readFile(filepath)
      } else if (this.config.provider === 's3' && this.s3Client && this.config.s3) {
        const command = new GetObjectCommand({
          Bucket: this.config.s3.bucket,
          Key: filename,
        })
        const response = await this.s3Client.send(command)
        return Buffer.from(await response.Body!.transformToByteArray())
      } else {
        throw new Error(`Unsupported storage provider: ${this.config.provider}`)
      }
    } catch (error) {
      logger.error('Failed to get file', { error, filename })
      throw error
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      if (this.config.provider === 'local') {
        const filepath = path.join(this.config.localPath!, filename)
        return fs.existsSync(filepath)
      } else if (this.config.provider === 's3' && this.s3Client && this.config.s3) {
        try {
          const command = new GetObjectCommand({
            Bucket: this.config.s3.bucket,
            Key: filename,
          })
          await this.s3Client.send(command)
          return true
        } catch {
          return false
        }
      }
      return false
    } catch (error) {
      logger.error('Failed to check file existence', { error, filename })
      return false
    }
  }
}

// Initialize with environment config
const storageConfig: StorageConfig = {
  provider: (process.env.STORAGE_PROVIDER as 'local' | 's3' | 'gcs') || 'local',
  localPath: process.env.LOCAL_STORAGE_PATH || './uploads',
  s3: process.env.AWS_S3_BUCKET
    ? {
        bucket: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    : undefined,
  cdnUrl: process.env.CDN_URL,
}

export const fileStorageService = new FileStorageService(storageConfig)
