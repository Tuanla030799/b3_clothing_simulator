import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/httpClient'
import { isListChanged, moveRow, sameOrder } from './listOrder'

describe('list order helpers', () => {
  it('moves one row without changing the input', () => {
    const rows = ['a', 'b', 'c', 'd']
    expect(moveRow(rows, 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(moveRow(rows, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveRow(rows, 1, 9)).toEqual(rows)
    expect(moveRow(rows, -1, 0)).toEqual(rows)
    expect(rows).toEqual(['a', 'b', 'c', 'd'])
  })

  it('compares orders', () => {
    expect(sameOrder(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(sameOrder(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(sameOrder(['a'], ['a', 'b'])).toBe(false)
  })

  it('recognises the LIST_CHANGED conflict only', () => {
    const conflict = (message: string) =>
      new ApiError('http', 'x', { status: 409, errors: [{ field: 'ids', message }] })
    expect(isListChanged(conflict('LIST_CHANGED'))).toBe(true)
    expect(isListChanged(conflict('OTHER'))).toBe(false)
    expect(isListChanged(new Error('LIST_CHANGED'))).toBe(false)
  })
})
