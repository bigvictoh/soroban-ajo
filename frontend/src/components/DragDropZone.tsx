import React, { useRef, useState, useCallback, DragEvent } from 'react'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

export interface FileWithProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  previewUrl?: string
}

export interface DragDropZoneProps {
  onFilesSelected: (files: File[]) => Promise<void>
  acceptedTypes?: string[]
  maxFiles?: number
  maxSizeBytes?: number
  disabled?: boolean
  className?: string
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFilesSelected,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024,
  disabled = false,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<FileWithProgress[]>([])

  const validateFiles = useCallback(
    (fileList: FileList): { valid: File[]; errors: string[] } => {
      const valid: File[] = []
      const errors: string[] = []

      if (fileList.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`)
        return { valid, errors }
      }

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]

        if (!acceptedTypes.includes(file.type)) {
          errors.push(`${file.name}: Unsupported file type`)
          continue
        }

        if (file.size > maxSizeBytes) {
          const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(0)
          errors.push(`${file.name}: Exceeds ${maxMB}MB limit`)
          continue
        }

        valid.push(file)
      }

      return { valid, errors }
    },
    [acceptedTypes, maxFiles, maxSizeBytes],
  )

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const { valid, errors } = validateFiles(fileList)

      if (errors.length > 0) {
        setFiles((prev) => [
          ...prev,
          ...errors.map((error) => ({
            file: new File([], 'error'),
            progress: 0,
            status: 'error' as const,
            error,
          })),
        ])
        return
      }

      const newFiles = valid.map((file) => ({
        file,
        progress: 0,
        status: 'pending' as const,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }))

      setFiles((prev) => [...prev, ...newFiles])

      try {
        await onFilesSelected(valid)
        setFiles((prev) =>
          prev.map((f) =>
            valid.includes(f.file) ? { ...f, status: 'success' as const, progress: 100 } : f,
          ),
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setFiles((prev) =>
          prev.map((f) =>
            valid.includes(f.file) ? { ...f, status: 'error' as const, error: message } : f,
          ),
        )
      }
    },
    [validateFiles, onFilesSelected],
  )

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled) handleFiles(e.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = [...prev]
      if (next[index].previewUrl) URL.revokeObjectURL(next[index].previewUrl!)
      next.splice(index, 1)
      return next
    })
  }

  const clearAll = () => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
    })
    setFiles([])
  }

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload files"
        aria-disabled={disabled}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && inputRef.current?.click()}
        className={clsx(
          'relative p-8 rounded-xl border-2 border-dashed transition-all',
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400',
          disabled && 'cursor-not-allowed opacity-50',
          !disabled && 'cursor-pointer',
        )}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload size={32} className="text-gray-400" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Drag files here or click to browse
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Supported: Images, PDF • Max {maxFiles} files • {(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB each
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="sr-only"
          aria-hidden="true"
          disabled={disabled}
        />
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </h3>
              {files.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Clear all
                </button>
              )}
            </div>

            <ul className="space-y-2">
              {files.map((f, idx) => (
                <motion.li
                  key={`${f.file.name}-${idx}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-lg',
                    f.status === 'error'
                      ? 'bg-red-50 dark:bg-red-950'
                      : f.status === 'success'
                        ? 'bg-green-50 dark:bg-green-950'
                        : 'bg-gray-50 dark:bg-gray-800',
                  )}
                >
                  {f.previewUrl && (
                    <img src={f.previewUrl} alt="" className="w-10 h-10 rounded object-cover" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {f.file.name}
                    </p>
                    {f.error && (
                      <p className="text-xs text-red-600 dark:text-red-400">{f.error}</p>
                    )}
                    {f.status === 'uploading' && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                        <div
                          className="bg-primary-500 h-1 rounded-full transition-all"
                          style={{ width: `${f.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {f.status === 'success' && (
                    <CheckCircle size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                  )}
                  {f.status === 'error' && (
                    <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}

                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Remove file"
                  >
                    <X size={16} />
                  </button>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
