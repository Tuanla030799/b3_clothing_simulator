import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Image from '../Image.vue'

describe('Image', () => {
  it('renders no <img> (no request) and shows the fallback when src is missing', () => {
    const wrapper = mount(Image, { props: { alt: 'Áo' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('Áo')
  })

  it('hides a decorative fallback from assistive technology', () => {
    const wrapper = mount(Image, { props: { alt: '' } })
    expect(wrapper.find('[role="img"]').exists()).toBe(false)
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('shows the fallback slot and emits error when loading fails', async () => {
    const wrapper = mount(Image, {
      props: { src: '/broken.png', alt: 'Ảnh' },
      slots: { fallback: 'Không tải được' },
    })
    await wrapper.get('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Không tải được')
    expect(wrapper.emitted('error')).toHaveLength(1)
  })

  it('resets to loading on source change and ignores events from the previous source', async () => {
    const wrapper = mount(Image, { props: { src: '/a.png', alt: 'Ảnh' } })
    const oldImg = wrapper.get('img').element
    await wrapper.get('img').trigger('error')
    expect(wrapper.attributes('data-status')).toBe('error')

    await wrapper.setProps({ src: '/b.png' })
    expect(wrapper.attributes('data-status')).toBe('loading')
    expect(wrapper.get('img').attributes('src')).toBe('/b.png')

    // A late event from the old element must not change the new source's state.
    oldImg.dispatchEvent(new Event('load'))
    expect(wrapper.attributes('data-status')).toBe('loading')
    expect(wrapper.emitted('load')).toBeUndefined()

    await wrapper.get('img').trigger('load')
    expect(wrapper.attributes('data-status')).toBe('loaded')
    expect(wrapper.emitted('load')).toHaveLength(1)
  })

  it('keeps the image rendered while loading so native lazy loading can trigger', () => {
    const wrapper = mount(Image, { props: { src: '/a.png', alt: 'Ảnh' } })
    const img = wrapper.get('img')
    expect(img.attributes('loading')).toBe('lazy')
    expect(img.isVisible()).toBe(true)
  })
})
