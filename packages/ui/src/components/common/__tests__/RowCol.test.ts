import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import Col from '../Col.vue'
import Row from '../Row.vue'

describe('Row / Col element choice', () => {
  it('render divs by default', () => {
    expect(mount(Row).element.tagName).toBe('DIV')
    expect(mount(Col).element.tagName).toBe('DIV')
  })

  it('make a native list when Row is ul and Col is li, keeping the grid behaviour', () => {
    const wrapper = mount(Row, {
      props: { as: 'ul', gutter: [16, 8] },
      attrs: { 'aria-label': 'Sản phẩm' },
      slots: {
        default: () => [
          h(Col, { as: 'li', xs: 12, md: 8 }, () => 'a'),
          h(Col, { as: 'li', xs: 12, md: 8 }, () => 'b'),
        ],
      },
    })
    expect(wrapper.element.tagName).toBe('UL')
    expect(wrapper.attributes('aria-label')).toBe('Sản phẩm')
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    expect(wrapper.element.style.getPropertyValue('--row-gutter-x')).toBe('16px')
    expect(wrapper.element.style.getPropertyValue('--row-gutter-y')).toBe('8px')
    expect(items[0]!.element.style.getPropertyValue('--col-w-md')).toBe('calc(8 * 100% / 24)')
    expect(items[0]!.classes()).toContain('min-w-0')
  })
})
