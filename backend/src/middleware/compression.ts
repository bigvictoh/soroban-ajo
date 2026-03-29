import compression from 'compression'
import { Request, Response } from 'express'

/**
 * Compression middleware configuration
 * 
 * Default behavior:
 * - Compresses all responses that are >= 1KB
 * - Supports GZIP, Deflate, and Brotli (if available)
 */
export const compressionMiddleware = compression({
  // Only compress responses if the size is greater than 1KB
  threshold: 1024,
  // Filter function to determine if a response should be compressed
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      // Don't compress responses if this custom header is present
      return false
    }
    // Fallback to standard compression filter
    return compression.filter(req, res)
  },
})
