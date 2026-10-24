import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import Modal from '../Modal.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

function open(props: Record<string, unknown> = {}) {
  return mount(Modal, {
    props: { title: 'Đơn LT-7K3M9QXA', open: true, ...props },
    slots: { default: '<p>Nội dung</p>', footer: '<button type="button">OK</button>' },
    attachTo: document.body,
  })
}

describe('Modal', () => {
  it('renders an accessible dialog named by its title', async () => {
    open({ description: 'Chi tiết đơn hàng' })
    await flushPromises()
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog).not.toBeNull()
    const titleId = dialog.getAttribute('aria-labelledby')!
    expect(document.getElementById(titleId)?.textContent).toBe('Đơn LT-7K3M9QXA')
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent,
    ).toContain('Chi tiết đơn hàng')
    expect(dialog.textContent).toContain('Nội dung')
    expect(dialog.textContent).toContain('OK')
  })

  it('closes with the close button and with Escape', async () => {
    const wrapper = open()
    await flushPromises()
    ;(document.querySelector('button[aria-label="Đóng"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])

    const again = open()
    await flushPromises()
    document
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(again.emitted('update:open')?.[0]).toEqual([false])
  })

  it('renders nothing while closed', async () => {
    open({ open: false })
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
