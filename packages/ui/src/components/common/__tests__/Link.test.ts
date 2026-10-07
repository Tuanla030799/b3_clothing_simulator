import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import Flex from '../Flex.vue'
import Link from '../Link.vue'

describe('Link', () => {
  it('renders a native anchor and forwards href and other attributes', () => {
    const wrapper = mount(Link, {
      props: {},
      attrs: { href: '/gioi-thieu', id: 'about' },
      slots: { default: 'Giới thiệu' },
    })
    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('href')).toBe('/gioi-thieu')
    expect(wrapper.attributes('id')).toBe('about')
    expect(wrapper.attributes('aria-current')).toBeUndefined()
    expect(wrapper.attributes('target')).toBeUndefined()
  })

  it('marks the current page for assistive technology', () => {
    const wrapper = mount(Link, { props: { active: true, variant: 'nav' }, attrs: { href: '/' } })
    expect(wrapper.attributes('aria-current')).toBe('page')
    expect(wrapper.classes()).toContain('bg-secondary')
  })

  it('opens external links safely in a new tab and tells screen readers', () => {
    const wrapper = mount(Link, {
      props: { external: true },
      attrs: { href: 'https://example.com' },
      slots: { default: 'Facebook' },
    })
    expect(wrapper.attributes('target')).toBe('_blank')
    expect(wrapper.attributes('rel')).toBe('noopener noreferrer')
    expect(wrapper.get('.sr-only').text()).toBe('(mở trong tab mới)')
  })

  it('renders a given component (e.g. a router link) and passes its props through', () => {
    const received: Record<string, unknown>[] = []
    const RouterLinkStub = defineComponent({
      inheritAttrs: false,
      setup(_, { attrs, slots }) {
        received.push({ ...attrs })
        return () => h('a', { href: String(attrs.to), class: attrs.class }, slots.default?.())
      },
    })
    const wrapper = mount(Link, {
      props: { as: RouterLinkStub },
      attrs: { to: '/san-pham' },
      slots: { default: 'Sản phẩm' },
    })
    expect(received[0]).toMatchObject({ to: '/san-pham' })
    expect(wrapper.get('a').attributes('href')).toBe('/san-pham')
    expect(wrapper.get('a').classes().join(' ')).toContain('focus-visible:outline-2')
  })
})

describe('Flex as', () => {
  it('renders a div by default and the requested element when set', () => {
    expect(mount(Flex).element.tagName).toBe('DIV')
    const list = mount(Flex, { props: { as: 'ul' }, slots: { default: '<li>a</li><li>b</li>' } })
    expect(list.element.tagName).toBe('UL')
    expect(list.findAll('li')).toHaveLength(2)
    expect(list.classes()).toContain('flex')
  })

  it('keeps layout props and native attributes on the chosen element', () => {
    const nav = mount(Flex, {
      props: { as: 'nav', vertical: true, gap: 'small' },
      attrs: { 'aria-label': 'Menu' },
    })
    expect(nav.element.tagName).toBe('NAV')
    expect(nav.classes()).toEqual(expect.arrayContaining(['flex-col', 'gap-2']))
    expect(nav.attributes('aria-label')).toBe('Menu')
  })
})
