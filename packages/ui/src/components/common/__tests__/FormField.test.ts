import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import FormField from '../FormField.vue'
import type { FormFieldSlotProps } from '../types'

function mountField(props: Record<string, unknown>, slots: Record<string, unknown> = {}) {
  return mount(FormField, {
    props: { for: 'name', ...props },
    slots: {
      default: (slotProps: FormFieldSlotProps) =>
        h('input', {
          id: slotProps.id,
          'aria-describedby': slotProps.describedBy,
          'aria-invalid': slotProps.invalid || undefined,
          required: slotProps.required,
        }),
      ...slots,
    },
  })
}

describe('FormField', () => {
  it('associates the label with the control through for/id', () => {
    const wrapper = mountField({ label: 'Tên', required: true })
    expect(wrapper.get('label').attributes('for')).toBe('name')
    expect(wrapper.get('input').attributes('id')).toBe('name')
    expect(wrapper.get('input').attributes('required')).toBeDefined()
  })

  it('describes the control with the rendered description', () => {
    const wrapper = mountField({ description: 'Tối đa 20 ký tự' })
    const describedBy = wrapper.get('input').attributes('aria-describedby')
    expect(describedBy).toBe('name-description')
    expect(wrapper.get(`#${describedBy}`).text()).toBe('Tối đa 20 ký tự')
  })

  it('replaces the description with the error and marks the control invalid', () => {
    const wrapper = mountField({ description: 'Mô tả', error: 'Bắt buộc' })
    const input = wrapper.get('input')
    expect(input.attributes('aria-describedby')).toBe('name-error')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('#name-description').exists()).toBe(false)
    expect(wrapper.get('#name-error').text()).toBe('Bắt buộc')
  })

  it('does not reference anything when neither description nor error is rendered', () => {
    const wrapper = mountField({ label: 'Tên' })
    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()
  })

  it('lets slots override the matching props', () => {
    const wrapper = mountField(
      { label: 'Prop label', error: 'Prop error' },
      { label: () => 'Slot label', error: () => 'Slot error' },
    )
    expect(wrapper.get('label').text()).toBe('Slot label')
    expect(wrapper.get('#name-error').text()).toBe('Slot error')
  })
})
