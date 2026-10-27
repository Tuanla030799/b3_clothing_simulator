import { describe, expect, it } from 'vitest'
import { categoryRoute, childrenOf, depthOf, lineage, lineageIds } from './categoryTree'

const tree = [
  { id: 'ao', parentId: null, name: 'Áo' },
  { id: 'thun', parentId: 'ao', name: 'Áo thun' },
  { id: 'co-tron', parentId: 'thun', name: 'Cổ tròn' },
  { id: 'len', parentId: 'ao', name: 'Áo len' },
  { id: 'quan', parentId: null, name: 'Quần' },
]

describe('category tree', () => {
  it('walks from a category to the root', () => {
    expect(lineageIds(tree, 'co-tron')).toEqual(['co-tron', 'thun', 'ao'])
    expect(lineageIds(tree, 'unknown')).toEqual(['unknown'])
    expect(depthOf(tree, 'co-tron')).toBe(3)
    expect(depthOf(tree, 'quan')).toBe(1)
    expect(lineage(tree, 'co-tron').map((c) => c.name)).toEqual(['Áo', 'Áo thun', 'Cổ tròn'])
    expect(lineage(tree, 'unknown')).toEqual([])
  })

  it('lists children in the API order', () => {
    expect(childrenOf(tree, null).map((c) => c.id)).toEqual(['ao', 'quan'])
    expect(childrenOf(tree, 'ao').map((c) => c.id)).toEqual(['thun', 'len'])
    expect(childrenOf(tree, 'len')).toEqual([])
  })

  it('builds the route of a category path', () => {
    expect(categoryRoute('ao/ao-thun')).toEqual({
      name: 'category',
      params: { path: ['ao', 'ao-thun'] },
    })
  })
})
