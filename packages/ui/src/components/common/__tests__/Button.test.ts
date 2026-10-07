import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import Button from '../Button.vue'

describe('Button', () => {
  it('maps htmlType to the native type and defaults to "button"', () => {
    expect(mount(Button).attributes('type')).toBe('button')
    expect(mount(Button, { props: { htmlType: 'submit' } }).attributes('type')).toBe('submit')
  })

  it('blocks clicks and form submission while loading but keeps the accessible name', async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault())
    const wrapper = mount(
      {
        render: () =>
          h('form', { onSubmit }, [h(Button, { htmlType: 'submit', loading: true }, () => 'Lưu')]),
      },
      { attachTo: document.body },
    )
    const button = wrapper.get('button')
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).toBe('Lưu')

    await button.trigger('click')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(wrapper.findComponent(Button).emitted('click')).toBeUndefined()
    wrapper.unmount()
  })

  it('emits click when enabled and uses native disabled when disabled', async () => {
    const enabled = mount(Button)
    await enabled.trigger('click')
    expect(enabled.emitted('click')).toHaveLength(1)

    const disabled = mount(Button, { props: { disabled: true } })
    expect(disabled.attributes('disabled')).toBeDefined()
  })
})
