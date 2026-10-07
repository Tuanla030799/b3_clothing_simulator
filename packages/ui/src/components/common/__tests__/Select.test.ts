import { mount } from '@vue/test-utils'
import { SelectRoot } from 'reka-ui'
import { describe, expect, it } from 'vitest'
import Select from '../Select.vue'
import type { SelectOption } from '../types'

const options: SelectOption[] = [
  { label: 'Số 1', value: 1 },
  { label: 'Chuỗi 1', value: '1' },
]

describe('Select', () => {
  it('emits the option value with its original type', () => {
    const wrapper = mount(Select, { props: { options } })
    wrapper.findComponent(SelectRoot).vm.$emit('update:modelValue', 1)
    wrapper.findComponent(SelectRoot).vm.$emit('update:modelValue', '1')
    expect(wrapper.emitted('update:modelValue')).toEqual([[1], ['1']])
  })

  it('emits undefined when cleared and returns focus to the trigger', async () => {
    const wrapper = mount(Select, {
      props: { options, modelValue: 1, allowClear: true },
      attachTo: document.body,
    })
    await wrapper.get('button[aria-label="Xóa lựa chọn"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[undefined]])
    expect(document.activeElement?.getAttribute('role')).toBe('combobox')
    wrapper.unmount()
  })

  it('does not offer clearing without a value, while disabled or while loading', () => {
    const clear = 'button[aria-label="Xóa lựa chọn"]'
    expect(
      mount(Select, { props: { options, allowClear: true } })
        .find(clear)
        .exists(),
    ).toBe(false)
    expect(
      mount(Select, { props: { options, allowClear: true, modelValue: 1, disabled: true } })
        .find(clear)
        .exists(),
    ).toBe(false)
    expect(
      mount(Select, { props: { options, allowClear: true, modelValue: 1, loading: true } })
        .find(clear)
        .exists(),
    ).toBe(false)
  })

  it('blocks value changes while loading and exposes the busy state', () => {
    const wrapper = mount(Select, { props: { options, loading: true } })
    const trigger = wrapper.get('[role="combobox"]')
    expect(trigger.attributes('aria-busy')).toBe('true')
    expect(trigger.attributes('disabled')).toBeDefined()
    wrapper.findComponent(SelectRoot).vm.$emit('update:modelValue', 1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('forwards id and ARIA attributes to the trigger', () => {
    const wrapper = mount(Select, {
      props: { options },
      attrs: { id: 'size', 'aria-describedby': 'size-description' },
    })
    const trigger = wrapper.get('[role="combobox"]')
    expect(trigger.attributes('id')).toBe('size')
    expect(trigger.attributes('aria-describedby')).toBe('size-description')
  })
})
