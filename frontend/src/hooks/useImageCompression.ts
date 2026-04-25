import { useCallback } from 'react'

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

export function useImageCompression() {
  const compress = useCallback(async (file: File, options: CompressionOptions = {}): Promise<File> => {
    const { maxWidth = 1920, maxHeight = 1920, quality = 0.8 } = options

    if (!file.type.startsWith('image/')) return file

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width *= ratio
            height *= ratio
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressed = new File([blob], file.name, { type: file.type })
                resolve(compressed)
              } else {
                resolve(file)
              }
            },
            file.type,
            quality,
          )
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }, [])

  return { compress }
}
