export type ButtonVariant = 'primary' | 'default' | 'dashed' | 'text' | 'link' | 'destructive'

export type ButtonSize = 'small' | 'middle' | 'large'

export type ButtonHtmlType = 'button' | 'submit' | 'reset'

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline'

export type FlexJustify =
  'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'

export type FlexGap = 'small' | 'middle' | 'large' | number

export interface FormFieldSlotProps {
  id: string
  describedBy: string | undefined
  invalid: boolean
  required: boolean
}

export type ImageFit = 'contain' | 'cover'

export type ImageLoading = 'lazy' | 'eager'

export type RowAlign = 'top' | 'middle' | 'bottom' | 'stretch'

export type RowJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around'

export type SelectOptionValue = string | number

export type SelectSize = 'small' | 'middle' | 'large'

export interface SelectOption {
  label: string
  value: SelectOptionValue
  disabled?: boolean
}

export type TypographyElement = 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export type TypographyVariant = 'title' | 'heading' | 'subheading' | 'body' | 'caption'

export type TypographyWeight = 'regular' | 'medium' | 'semibold' | 'bold'

export type TypographyAlign = 'left' | 'center' | 'right'

export type DropdownTrigger = 'click' | 'hover'

export type DropdownPlacement = 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'

export interface DropdownItem {
  key: string
  label: string
  disabled?: boolean
  danger?: boolean
}

export type { ColBreakpoint, ColSize, RowGutter } from './grid'
