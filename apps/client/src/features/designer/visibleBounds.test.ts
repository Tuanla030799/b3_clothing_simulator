import { describe, expect, it } from 'vitest'
import { boundsOfAlpha, FULL_IMAGE } from './visibleBounds'
import { buildSetScene, type SceneInput } from './setScene'

function scan(width: number, height: number, visible: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4)
  const [x0, y0, x1, y1] = visible
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) data[(y * width + x) * 4 + 3] = 255
  return data
}

describe('boundsOfAlpha', () => {
  it('returns the box of the visible pixels as fractions', () => {
    expect(boundsOfAlpha(scan(10, 10, [2, 3, 5, 6]), 10, 10)).toEqual({
      x: 0.2,
      y: 0.3,
      width: 0.4,
      height: 0.4,
    })
  })

  it('ignores faint pixels and falls back to the full image when nothing is visible', () => {
    const faint = new Uint8ClampedArray(4 * 4 * 4)
    faint[3] = 10
    expect(boundsOfAlpha(faint, 4, 4)).toEqual(FULL_IMAGE)
  })
})

describe('buildSetScene with a visible box', () => {
  it('draws the full image so that its visible box lands on the placement', () => {
    const image = { element: {} as HTMLImageElement, width: 1000, height: 1000 }
    const input: SceneInput = {
      size: { width: 1200, height: 600 },
      background: null,
      placements: [{ instanceId: 'a', x: 100, y: 50, width: 200, height: 100 }],
      sources: [
        {
          instanceId: 'a',
          position: 1,
          name: 'a',
          zones: [],
          productImage: image,
          visible: { x: 0.25, y: 0.5, width: 0.5, height: 0.25 },
          designOf: () => undefined,
        },
      ],
      resources: { textLayoutOf: () => null, imageOf: () => undefined },
    }
    const [item] = buildSetScene(input).items
    expect(item).toMatchObject({ width: 400, height: 400, x: 0, y: -150 })
  })
})
