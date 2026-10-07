import { UPLOAD_LIMITS } from './data/designOptions'

/*
 * Upload validation. The format comes from the file signature (not the extension or the
 * browser-reported type) and the pixel size is read from the header before decoding when possible,
 * so oversized images are rejected before the browser allocates a bitmap.
 */

export type UploadImageType = (typeof UPLOAD_LIMITS.types)[number]

export interface ImageHeader {
  type: UploadImageType
  /** Undefined when the header does not expose the size cheaply. */
  width?: number
  height?: number
}

export type UploadError =
  'unsupported-type' | 'file-too-large' | 'dimensions-too-large' | 'decode-failed'

export const uploadErrorMessages: Record<UploadError, string> = {
  'unsupported-type': 'Chỉ hỗ trợ ảnh PNG, JPEG hoặc WebP.',
  'file-too-large': `Ảnh vượt quá ${UPLOAD_LIMITS.maxBytes / 1024 / 1024} MB.`,
  'dimensions-too-large': `Ảnh lớn hơn ${UPLOAD_LIMITS.maxDimension} × ${UPLOAD_LIMITS.maxDimension} điểm ảnh.`,
  'decode-failed': 'Không đọc được ảnh này. Hãy thử một ảnh khác.',
}

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length))
const u16be = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!
const u32be = (b: Uint8Array, i: number) =>
  ((b[i]! << 24) | (b[i + 1]! << 16) | u16be(b, i + 2)) >>> 0
const u24le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16)

export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  // PNG: signature + IHDR.
  if (bytes.length >= 24 && u32be(bytes, 0) === 0x89504e47 && u32be(bytes, 4) === 0x0d0a1a0a) {
    return { type: 'image/png', width: u32be(bytes, 16), height: u32be(bytes, 20) }
  }

  // JPEG: SOI, then walk segments to the first start-of-frame marker.
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let i = 2
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++
        continue
      }
      const marker = bytes[i + 1]!
      if (marker === 0xff) {
        i++
        continue
      }
      const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
      if (isSof)
        return { type: 'image/jpeg', height: u16be(bytes, i + 5), width: u16be(bytes, i + 7) }
      if (marker === 0xd9 || marker === 0xda) break
      i += 2 + u16be(bytes, i + 2)
    }
    return { type: 'image/jpeg' }
  }

  // WebP: RIFF container with VP8 / VP8L / VP8X chunk.
  if (bytes.length >= 30 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    const chunk = ascii(bytes, 12, 4)
    if (chunk === 'VP8X') {
      return { type: 'image/webp', width: u24le(bytes, 24) + 1, height: u24le(bytes, 27) + 1 }
    }
    if (chunk === 'VP8 ') {
      return {
        type: 'image/webp',
        width: (bytes[26]! | (bytes[27]! << 8)) & 0x3fff,
        height: (bytes[28]! | (bytes[29]! << 8)) & 0x3fff,
      }
    }
    if (chunk === 'VP8L') {
      const b = bytes
      return {
        type: 'image/webp',
        width: 1 + (((b[22]! & 0x3f) << 8) | b[21]!),
        height: 1 + (((b[24]! & 0x0f) << 10) | (b[23]! << 2) | ((b[22]! & 0xc0) >> 6)),
      }
    }
    return { type: 'image/webp' }
  }

  return null
}

export function dimensionsAllowed(width: number, height: number): boolean {
  return (
    width > 0 &&
    height > 0 &&
    width <= UPLOAD_LIMITS.maxDimension &&
    height <= UPLOAD_LIMITS.maxDimension &&
    width * height <= UPLOAD_LIMITS.maxPixels
  )
}

/** Checks size, signature and header dimensions. Decoding is verified separately. */
export async function inspectUpload(file: Blob): Promise<UploadError | null> {
  if (file.size > UPLOAD_LIMITS.maxBytes) return 'file-too-large'
  const header = readImageHeader(new Uint8Array(await file.arrayBuffer()))
  if (!header) return 'unsupported-type'
  if (header.width !== undefined && header.height !== undefined) {
    if (!dimensionsAllowed(header.width, header.height)) return 'dimensions-too-large'
  }
  return null
}

export interface DecodedImage {
  element: HTMLImageElement
  width: number
  height: number
}

/** Decodes an image URL with window.Image (the DOM <Image> component name is taken). */
export function decodeImage(url: string): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const element = new window.Image()
    element.decoding = 'async'
    element.onload = () => {
      const width = element.naturalWidth
      const height = element.naturalHeight
      if (width > 0 && height > 0) resolve({ element, width, height })
      else reject(new Error('Image has no size'))
    }
    element.onerror = () => reject(new Error('Image failed to load'))
    element.src = url
  })
}
