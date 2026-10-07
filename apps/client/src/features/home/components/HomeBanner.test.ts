// @vitest-environment jsdom
/* eslint-disable vue/one-component-per-file -- small stubs of the Swiper components */
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, onMounted } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../../../router'

// Swiper needs a real layout engine, so it is replaced by a stub that exposes the few instance
// methods the banner calls. The tests cover the banner's own behaviour (timer, hold, pause).
const swiper = vi.hoisted(() => ({
  instance: { slideNext: vi.fn(), slidePrev: vi.fn(), slideTo: vi.fn(), activeIndex: 0 },
  emit: undefined as undefined | ((event: string, ...args: unknown[]) => void),
}))

vi.mock('swiper/vue', () => ({
  Swiper: defineComponent({
    emits: ['swiper', 'slideChange'],
    setup(_, { emit, slots }) {
      swiper.emit = emit as never
      onMounted(() => emit('swiper', swiper.instance))
      return () => h('div', { class: 'swiper' }, slots.default?.())
    },
  }),
  SwiperSlide: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('div', { class: 'swiper-slide' }, slots.default?.()),
  }),
}))
vi.mock('swiper/modules', () => ({ A11y: {}, Keyboard: {} }))
vi.mock('swiper/css', () => ({}))

import HomeBanner from './HomeBanner.vue'

function mockMotionPreference(reduced: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }))
}

async function mountBanner() {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/')
  await router.isReady()
  return mount(HomeBanner, { global: { plugins: [router] }, attachTo: document.body })
}

const slideTo = (index: number) => {
  swiper.instance.activeIndex = index
  swiper.emit?.('slideChange', swiper.instance)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  swiper.instance.activeIndex = 0
  mockMotionPreference(false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('HomeBanner auto-advance', () => {
  it('moves to the next slide every 6 seconds and restarts after any slide change', async () => {
    await mountBanner()
    vi.advanceTimersByTime(5999)
    expect(swiper.instance.slideNext).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(swiper.instance.slideNext).toHaveBeenCalledTimes(1)

    slideTo(1) // also covers manual changes: the countdown starts over
    await Promise.resolve()
    vi.advanceTimersByTime(5999)
    expect(swiper.instance.slideNext).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(swiper.instance.slideNext).toHaveBeenCalledTimes(2)
  })

  it('holds while hovered or focused, and resumes when the pointer or focus leaves', async () => {
    const wrapper = await mountBanner()
    const banner = wrapper.get('section')

    await banner.trigger('mouseenter')
    vi.advanceTimersByTime(20000)
    expect(swiper.instance.slideNext).not.toHaveBeenCalled()
    await banner.trigger('mouseleave')
    vi.advanceTimersByTime(6000)
    expect(swiper.instance.slideNext).toHaveBeenCalledTimes(1)

    await banner.trigger('focusin')
    vi.advanceTimersByTime(20000)
    expect(swiper.instance.slideNext).toHaveBeenCalledTimes(1)
  })

  it('stops with the pause button and starts again with the play button', async () => {
    const wrapper = await mountBanner()
    await wrapper.get('button[aria-label="Tạm dừng tự động chuyển slide"]').trigger('click')
    vi.advanceTimersByTime(20000)
    expect(swiper.instance.slideNext).not.toHaveBeenCalled()

    await wrapper.get('button[aria-label="Bật tự động chuyển slide"]').trigger('click')
    vi.advanceTimersByTime(6000)
    expect(swiper.instance.slideNext).toHaveBeenCalledTimes(1)
  })

  it('does not auto-advance when the visitor prefers reduced motion, but can be switched on', async () => {
    mockMotionPreference(true)
    const wrapper = await mountBanner()
    vi.advanceTimersByTime(20000)
    expect(swiper.instance.slideNext).not.toHaveBeenCalled()
    expect(wrapper.find('button[aria-label="Bật tự động chuyển slide"]').exists()).toBe(true)
  })

  it('stops its timer when removed from the page', async () => {
    const wrapper = await mountBanner()
    wrapper.unmount()
    vi.advanceTimersByTime(20000)
    expect(swiper.instance.slideNext).not.toHaveBeenCalled()
  })
})

describe('HomeBanner controls', () => {
  it('jumps to the chosen slide from the dots and marks the current one', async () => {
    const wrapper = await mountBanner()
    await wrapper.get('button[aria-label="Chuyển tới slide 3"]').trigger('click')
    expect(swiper.instance.slideTo).toHaveBeenCalledWith(2)

    slideTo(2)
    await Promise.resolve()
    expect(wrapper.get('button[aria-label="Chuyển tới slide 3"]').attributes('aria-current')).toBe(
      'true',
    )
    expect(wrapper.get('button[aria-label="Chuyển tới slide 1"]').attributes('aria-current')).toBe(
      undefined,
    )
  })
})
