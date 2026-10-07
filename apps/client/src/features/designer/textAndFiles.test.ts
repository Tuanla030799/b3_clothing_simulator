import { describe, expect, it } from 'vitest'
import { UPLOAD_LIMITS } from './data/designOptions'
import { inspectUpload, readImageHeader } from './imageFiles'
import { layoutText, loadDesignFont, REFERENCE_FONT_SIZE, type LineMetrics } from './textLayout'

// Fake metrics: diacritics raise the ascent like stacked Vietnamese marks do.
const measure = (line: string): LineMetrics => ({
  left: line.length * 10,
  right: line.length * 10,
  ascent: /[ễậọả]/i.test(line) ? 110 : 75,
  descent: /g/.test(line) ? 30 : 5,
})

describe('layoutText', () => {
  it('returns nothing for blank or whitespace content', () => {
    expect(layoutText('', measure)).toBeNull()
    expect(layoutText('  \n\t ', measure)).toBeNull()
  })

  it('sizes the box from the real ink so stacked diacritics are inside it', () => {
    const plain = layoutText('Nguyen', measure)!
    const accented = layoutText('Nguyễn', measure)!
    expect(accented.height).toBeGreaterThan(plain.height)
    const line = accented.lines[0]!
    // Top of the ink (baseline - ascent) is inside the box.
    expect(line.y - 110).toBeGreaterThanOrEqual(0)
    expect(line.y + 30).toBeLessThanOrEqual(accented.height)
  })

  it('keeps typed line breaks and centres every line', () => {
    const layout = layoutText('Bảo Ngọc\nĐậu', measure)!
    expect(layout.lines.map((l) => l.text)).toEqual(['Bảo Ngọc', 'Đậu'])
    expect(layout.lines[1]!.y - layout.lines[0]!.y).toBeCloseTo(REFERENCE_FONT_SIZE * 1.3)
    expect(layout.lines[0]!.x).toBe(layout.lines[1]!.x)
  })
})

describe('loadDesignFont', () => {
  const fontSet = (faces: { status: string }[] | Error, check = true) =>
    ({
      load: () => (faces instanceof Error ? Promise.reject(faces) : Promise.resolve(faces)),
      check: () => check,
    }) as unknown as FontFaceSet

  it('succeeds only when matching faces really loaded', async () => {
    expect(await loadDesignFont('Đậu', fontSet([{ status: 'loaded' }]))).toBe(true)
  })

  it('never reports success for a missing, failed or fallback font', async () => {
    expect(await loadDesignFont('Đậu', fontSet([]))).toBe(false)
    expect(await loadDesignFont('Đậu', fontSet([{ status: 'error' }]))).toBe(false)
    expect(await loadDesignFont('Đậu', fontSet(new Error('network')))).toBe(false)
    expect(await loadDesignFont('Đậu', fontSet([{ status: 'loaded' }], false))).toBe(false)
  })
})

function png(width: number, height: number) {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82])
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  return bytes
}

function jpeg(width: number, height: number) {
  // SOI, APP0 (length 4), SOF0 with height/width.
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 255,
    width >> 8,
    width & 255,
    0x03,
    0,
    0,
    0,
  ])
}

describe('upload validation', () => {
  it('detects formats by signature and reads their pixel size', () => {
    expect(readImageHeader(png(300, 200))).toEqual({ type: 'image/png', width: 300, height: 200 })
    expect(readImageHeader(jpeg(640, 480))).toEqual({ type: 'image/jpeg', width: 640, height: 480 })
    const webp = new Uint8Array(30)
    webp.set(
      [...'RIFF'].map((c) => c.charCodeAt(0)),
      0,
    )
    webp.set(
      [...'WEBPVP8X'].map((c) => c.charCodeAt(0)),
      8,
    )
    webp.set([99, 0, 0, 49, 0, 0], 24) // 100 × 50
    expect(readImageHeader(webp)).toEqual({ type: 'image/webp', width: 100, height: 50 })
  })

  it('rejects SVG, GIF and renamed non-images', async () => {
    const enc = new TextEncoder()
    expect(readImageHeader(enc.encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
    expect(readImageHeader(enc.encode('GIF89a......'))).toBeNull()
    expect(await inspectUpload(new Blob([enc.encode('not an image')]))).toBe('unsupported-type')
  })

  it('rejects oversized files and dimensions before decoding', async () => {
    expect(await inspectUpload(new Blob([png(100, 100)]))).toBeNull()
    const big = UPLOAD_LIMITS.maxDimension + 1
    expect(await inspectUpload(new Blob([png(big, 10)]))).toBe('dimensions-too-large')
    const huge = { size: UPLOAD_LIMITS.maxBytes + 1, arrayBuffer: async () => new ArrayBuffer(0) }
    expect(await inspectUpload(huge as Blob)).toBe('file-too-large')
  })
})
