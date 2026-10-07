// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../../../router'
import SiteHeader from './SiteHeader.vue'

async function setup(path = '/') {
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  const wrapper = mount(SiteHeader, { global: { plugins: [router] }, attachTo: document.body })
  return { router, wrapper }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SiteHeader', () => {
  it('marks only the current page in the menu', async () => {
    const { wrapper } = await setup('/bo-suu-tap/giang-sinh')
    const current = wrapper.findAll('nav a[aria-current="page"]').map((link) => link.text())
    // Sub-pages keep their section highlighted; the home item is not highlighted.
    expect(current).toEqual(['Bộ sưu tập'])
  })

  it('opens and closes the mobile menu with the toggle, announcing its state', async () => {
    const { wrapper } = await setup()
    const toggle = wrapper.get('#site-menu-toggle')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('#site-mobile-menu').exists()).toBe(false)

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.attributes('aria-label')).toBe('Đóng menu')
    expect(wrapper.find('#site-mobile-menu').exists()).toBe(true)

    await toggle.trigger('click')
    expect(wrapper.find('#site-mobile-menu').exists()).toBe(false)
  })

  it('closes on Escape and returns focus to the toggle', async () => {
    const { wrapper } = await setup()
    await wrapper.get('#site-menu-toggle').trigger('click')
    const link = wrapper.get('#site-mobile-menu a')
    ;(link.element as HTMLElement).focus()

    await wrapper.get('header').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('#site-mobile-menu').exists()).toBe(false)
    expect(document.activeElement?.id).toBe('site-menu-toggle')
  })

  it('closes when the visitor navigates, without stealing focus', async () => {
    const { wrapper, router } = await setup()
    await wrapper.get('#site-menu-toggle').trigger('click')
    expect(wrapper.find('#site-mobile-menu').exists()).toBe(true)

    await router.push('/san-pham')
    await flushPromises()
    expect(wrapper.find('#site-mobile-menu').exists()).toBe(false)
    expect(document.activeElement?.id).not.toBe('site-menu-toggle')
  })
})
