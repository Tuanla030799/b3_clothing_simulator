# @lituta/ui — component guide

Shared Vue 3 UI for the Lituta client (and the future admin app). Applications import **only**
from the public entry:

```ts
import { Button, Col, Row } from '@lituta/ui'
```

and load the shared styles once from their entry CSS:

```css
@import '@lituta/ui/styles.css';
```

**Use these components before writing UI by hand.** Do not rebuild a button, select, image or
layout primitive with raw HTML and repeated Tailwind classes. Native semantic elements
(`main`, `section`, `nav`, `ul`, `li`, `form`) remain appropriate. Use Tailwind for
feature-specific layout that no component API covers. Never style component internals with deep
selectors or `!important`; add the smallest shared variant instead.

## Quick reference

| Component  | Purpose                                 | Source                                                                             |
| ---------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| Container  | Centered page width + responsive gutter | [Container.vue](src/components/common/Container.vue)                               |
| Flex       | One-dimensional flex layout             | [Flex.vue](src/components/common/Flex.vue)                                         |
| Row / Col  | 24-column responsive grid               | [Row.vue](src/components/common/Row.vue), [Col.vue](src/components/common/Col.vue) |
| Typography | Text styles independent of HTML element | [Typography.vue](src/components/common/Typography.vue)                             |
| Button     | Actions                                 | [Button.vue](src/components/common/Button.vue)                                     |
| Link       | Navigation links (`<a>` or router link) | [Link.vue](src/components/common/Link.vue)                                         |
| Image      | DOM images with loading/fallback states | [Image.vue](src/components/common/Image.vue)                                       |
| FormField  | Label / description / error wiring      | [FormField.vue](src/components/common/FormField.vue)                               |
| Select     | Choose **one form value**               | [Select.vue](src/components/common/Select.vue)                                     |
| Dropdown   | Open an **action menu**                 | [Dropdown.vue](src/components/common/Dropdown.vue)                                 |
| EmptyState | Empty / no-content message              | [EmptyState.vue](src/components/common/EmptyState.vue)                             |

Public types (`ButtonVariant`, `SelectOption`, `DropdownItem`, `ColSize`, `RowGutter`, …) are
exported from [types.ts](src/components/common/types.ts). `cn()` (clsx + tailwind-merge) is also
exported. Everything in `src/components/ui` (shadcn-vue primitives) is internal.

Development playground with every state: run `yarn dev` and open `/?playground`.

## Layout

### Container

| Prop  | Type                                     | Default |
| ----- | ---------------------------------------- | ------- |
| size  | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'xl'`  |
| fluid | `boolean`                                | `false` |

Centers content with horizontal padding 16px → 24px (sm) → 32px (lg). `size` maps to
`--container-content-*` tokens: sm 40rem, md 48rem, lg 64rem, xl 80rem. `fluid` or
`size="full"` removes the max width but keeps the padding. Backgrounds, heights and borders go
through `class`. Slot: default.

### Flex

| Prop     | Type                                                                                  | Default     |
| -------- | ------------------------------------------------------------------------------------- | ----------- |
| as       | `'div' \| 'span' \| 'section' \| 'nav' \| 'ul' \| 'ol' \| 'li'`                       | `'div'`     |
| vertical | `boolean`                                                                             | `false`     |
| align    | `'start' \| 'center' \| 'end' \| 'stretch' \| 'baseline'`                             | `'stretch'` |
| justify  | `'start' \| 'center' \| 'end' \| 'space-between' \| 'space-around' \| 'space-evenly'` | `'start'`   |
| gap      | `'small' \| 'middle' \| 'large' \| number`                                            | `0`         |
| wrap     | `boolean`                                                                             | `false`     |

Gap presets: small 8px, middle 16px, large 24px; a number is pixels. Slot: default.

Use Flex instead of `flex …` utility classes. `as` picks the element so lists and landmarks keep
their native semantics: `<Flex as="ul">` renders a `<ul>` whose children are plain `<li>`; use
`as="li"` when a list item itself needs flex layout. Native attributes (`aria-label`, `role`…) and
`class` go to that element.

```vue
<Flex align="center" justify="space-between" gap="middle">…</Flex>

<Flex as="ul" wrap gap="small" aria-label="Tags">
  <li>…</li>
</Flex>
```

### Row / Col

Row:

| Prop    | Type                                                                   | Default   |
| ------- | ---------------------------------------------------------------------- | --------- |
| as      | `'div' \| 'ul' \| 'ol'`                                                | `'div'`   |
| gutter  | `number \| [number, number]` (px; number = horizontal, tuple = [h, v]) | `0`       |
| align   | `'top' \| 'middle' \| 'bottom' \| 'stretch'`                           | `'top'`   |
| justify | `'start' \| 'center' \| 'end' \| 'space-between' \| 'space-around'`    | `'start'` |
| wrap    | `boolean`                                                              | `true`    |

Col:

| Prop                    | Type                                           | Default |
| ----------------------- | ---------------------------------------------- | ------- |
| as                      | `'div' \| 'li'`                                | `'div'` |
| span                    | integer 0–24                                   | `24`    |
| offset                  | integer 0–23                                   | `0`     |
| xs, sm, md, lg, xl, xxl | `number \| { span?: number; offset?: number }` | —       |

- `as` picks the element: `<Row as="ul">` with `<Col as="li">` children gives a real list (grids
  of cards, menus) with the same grid behaviour; attributes such as `aria-label` go to that element.
- 24 columns. Horizontal gutter is applied as half-gutter column padding with a matching negative
  Row margin, so spans adding up to 24 always fit on one line. Keep a Row inside padded content
  (e.g. Container) so the negative margin never reaches the viewport edge.
- Breakpoints are Tailwind's: xs = base, sm 640px, md 768px, lg 1024px, xl 1280px, xxl = `2xl`
  1536px. Mobile-first; `span` and `offset` inherit **independently** from the nearest smaller
  breakpoint. `span` / `offset` are the base values; `xs` overrides them.
- `span = 0` hides the column at that breakpoint. Responsive behaviour is pure CSS (no window
  measuring).
- Out-of-range values are rounded and clamped.

```vue
<Row :gutter="[24, 16]">
  <Col :xs="24" :lg="6">…</Col>
  <Col :xs="24" :lg="12">…</Col>
  <Col :xs="24" :lg="{ span: 6 }">…</Col>
</Row>
```

Do not add Grid/GridItem components alongside Row/Col.

## Typography

| Prop     | Type                                                          | Default  |
| -------- | ------------------------------------------------------------- | -------- |
| as       | `'p' \| 'span' \| 'div' \| 'h1' … 'h6'`                       | `'p'`    |
| variant  | `'title' \| 'heading' \| 'subheading' \| 'body' \| 'caption'` | `'body'` |
| weight   | `'regular' \| 'medium' \| 'semibold' \| 'bold'`               | —        |
| align    | `'left' \| 'center' \| 'right'`                               | —        |
| ellipsis | `boolean` (single line)                                       | `false`  |

`as` controls semantics, `variant` controls looks — choose them independently. Text is rendered
as text (no HTML injection, no tooltip). `caption` uses the muted foreground color. Slot: default.

```vue
<Typography as="h2" variant="subheading">Chọn đồ</Typography>
```

## Button

| Prop     | Type                                                                      | Default     |
| -------- | ------------------------------------------------------------------------- | ----------- |
| variant  | `'primary' \| 'default' \| 'dashed' \| 'text' \| 'link' \| 'destructive'` | `'primary'` |
| size     | `'small' \| 'middle' \| 'large'` (32 / 40 / 48px)                         | `'middle'`  |
| loading  | `boolean`                                                                 | `false`     |
| disabled | `boolean`                                                                 | `false`     |
| htmlType | `'button' \| 'submit' \| 'reset'` → native `type`                         | `'button'`  |
| block    | `boolean` (full width)                                                    | `false`     |

Slots: `default` (label), `icon` (rendered before the label, hidden from assistive tech).
Event: `click(event: MouseEvent)` — not emitted while disabled or loading.

- `loading` shows a spinner in place of the icon, sets `aria-busy`/`aria-disabled`, keeps focus
  and label, and swallows clicks, Enter/Space activation and native form submission.
- `disabled` uses the native attribute.
- Icon-only buttons (icon slot, no label) become square; give them an `aria-label`.
- `variant="link"` is only a visual style; it has no navigation API.
- Other attributes (`aria-*`, `role`, `id`, …) are forwarded to the `<button>`.

```vue
<Button variant="default" :loading="saving" html-type="submit">
  <template #icon><Save /></template>
  Lưu
</Button>
```

## Link

| Prop          | Type                                      | Default                |
| ------------- | ----------------------------------------- | ---------------------- |
| as            | `string \| Component` (e.g. `RouterLink`) | `'a'`                  |
| variant       | `'text' \| 'nav' \| 'inverse' \| 'plain'` | `'text'`               |
| active        | `boolean`                                 | `false`                |
| external      | `boolean`                                 | `false`                |
| externalLabel | `string`                                  | `'(mở trong tab mới)'` |

Slot: default. Use Link instead of a bare `<a>`; it carries the focus ring and the variant style.

- `as` renders a native `<a>` by default (`href`, `download`… are forwarded). Pass a router link
  component to navigate without a page load; its own props (`to`) are passed through as attributes,
  so this package has no router dependency.
- `variant`: `text` inline link; `nav` menu item (padding, hover, highlighted when `active`);
  `inverse` for primary-colored backgrounds; `plain` no visual style (logos, icon links — set color
  and layout with `class`).
- `active` sets `aria-current="page"`.
- `external` adds `target="_blank"`, `rel="noopener noreferrer"` and a visually hidden notice.
- Link is for navigation. Actions that change state use Button; Button has no navigation API.

```vue
<Link href="/gioi-thieu">Giới thiệu</Link>
<Link :as="RouterLink" to="/san-pham" variant="nav" :active="isActive">Sản phẩm</Link>
<Link href="https://example.com" external variant="inverse">Facebook</Link>
```

## Image

| Prop    | Type                                                | Default     |
| ------- | --------------------------------------------------- | ----------- |
| src     | `string`                                            | —           |
| alt     | `string` (**required**; `""` for decorative images) | —           |
| width   | `number` (native attribute, intrinsic px)           | —           |
| height  | `number`                                            | —           |
| fit     | `'contain' \| 'cover'`                              | `'contain'` |
| loading | `'lazy' \| 'eager'`                                 | `'lazy'`    |

Slots: `fallback` (missing or failed source), `loading` (overlay while loading).
Events: `load(event)`, `error(event)`.

- Without `src` no `<img>` is rendered and no request is made; the fallback shows immediately.
- A changed `src` resets to loading; events from the previous source are ignored.
- While loading the `<img>` stays rendered (transparent), so native lazy loading still triggers.
- The fallback keeps the alt semantics (`role="img"` + `aria-label`, or hidden when `alt=""`).
- Frame size, aspect ratio and radius come from `class` on the component; the image fills it.
- The root exposes `data-status="loading|loaded|error"`.
- This is a DOM component only. For canvas work use `new window.Image()` to avoid the name clash.

```vue
<Image :src="product.image.src" :alt="product.name" class="size-16 rounded-md" />
```

## FormField

| Prop        | Type                                       | Default |
| ----------- | ------------------------------------------ | ------- |
| label       | `string`                                   | —       |
| for         | `string` (**required**, id of the control) | —       |
| description | `string`                                   | —       |
| error       | `string`                                   | —       |
| required    | `boolean`                                  | `false` |

Slots:

- `default` — scoped: `{ id, describedBy, invalid, required }`. Bind them to the control.
- `label`, `description`, `error` — replace the text of the matching prop.

Rules and precedence:

- A slot overrides the prop with the same name. A part renders when its prop is non-empty **or**
  its slot is provided.
- When an error renders, the description is hidden; `describedBy` points to `<for>-error` and
  `invalid` is `true`. Otherwise `describedBy` is `<for>-description` when a description renders,
  else `undefined`. It never references an element that is not rendered.
- `required` adds a visual asterisk (hidden from assistive tech) and is passed to the slot; set
  `required` on the control yourself.
- FormField is presentational: it does not hold values, validate or submit. No label/wrapper
  column layout or form context.

```vue
<FormField for="name" label="Tên thêu" description="Tối đa 20 ký tự." :error="nameError">
  <template #default="{ id, describedBy, invalid, required }">
    <input :id="id" v-model="name" :aria-describedby="describedBy"
           :aria-invalid="invalid || undefined" :required="required" />
  </template>
</FormField>
```

## Select

| Prop        | Type                                                               | Default    |
| ----------- | ------------------------------------------------------------------ | ---------- |
| modelValue  | `string \| number`                                                 | —          |
| options     | `{ label: string; value: string \| number; disabled?: boolean }[]` | (required) |
| placeholder | `string`                                                           | —          |
| disabled    | `boolean`                                                          | `false`    |
| loading     | `boolean`                                                          | `false`    |
| allowClear  | `boolean`                                                          | `false`    |
| size        | `'small' \| 'middle' \| 'large'`                                   | `'middle'` |

Event: `update:modelValue(value: string | number | undefined)` — use `v-model`.

- Single selection, built on the reka-ui Select primitive (keyboard: Enter/Space/Arrow keys to
  open, arrows to move, Enter to choose, Escape to close; typeahead).
- Values keep their type and are compared with `===`: `1` and `"1"` are different options.
- Disabled options cannot be chosen. An empty `options` list shows “Không có lựa chọn”.
- `loading` shows a spinner, sets `aria-busy` and blocks changes like `disabled`.
- `allowClear` shows a clear button (sibling of the trigger, never nested) when a value exists and
  the select is enabled; it emits `undefined` and returns focus to the trigger.
- `id`, `aria-*` and other attributes go to the trigger button, so FormField wiring and
  `<label for>` work.
- Not supported: multiple, search, remote options, infinite scroll.

```vue
<FormField for="size" label="Kích thước">
  <template #default="{ id, describedBy }">
    <Select :id="id" v-model="size" :options="sizeOptions" :aria-describedby="describedBy" allow-clear />
  </template>
</FormField>
```

## Dropdown

| Prop      | Type                                                                     | Default        |
| --------- | ------------------------------------------------------------------------ | -------------- |
| items     | `{ key: string; label: string; disabled?: boolean; danger?: boolean }[]` | (required)     |
| trigger   | `'click' \| 'hover'`                                                     | `'click'`      |
| placement | `'bottomLeft' \| 'bottomRight' \| 'topLeft' \| 'topRight'`               | `'bottomLeft'` |
| disabled  | `boolean`                                                                | `false`        |

Slot: `default` — exactly one focusable element (normally a `Button`). It **becomes** the
trigger (no extra button is wrapped around it, so buttons are never nested).
Event: `select(key: string)`.

- Disabled items are skipped by the keyboard and never emit. `danger` items use the destructive
  color. The menu closes after a selection; Escape closes it and returns focus to the trigger.
- `trigger="hover"` opens on mouse hover without moving focus and closes shortly after the
  pointer leaves trigger and menu. Keyboard (Enter/Space/ArrowDown) and touch (tap) still work.
  Hover menus are non-modal; click menus are modal.
- Not supported: submenus, grouped items.

```vue
<Dropdown :items="[{ key: 'delete', label: 'Xóa', danger: true }]" @select="onAction">
  <Button variant="default">Tùy chọn</Button>
</Dropdown>
```

## EmptyState

| Prop        | Type     | Default    |
| ----------- | -------- | ---------- |
| title       | `string` | (required) |
| description | `string` | —          |

Slots: `icon` (default: inbox icon), `default` (extra content), `action` (buttons). No built-in
business logic or reload button.

```vue
<EmptyState title="Bộ quà đang trống" description="Chọn sản phẩm để bắt đầu.">
  <template #action><Button variant="default">Chọn sản phẩm</Button></template>
</EmptyState>
```

## Tokens and fonts

- Tokens live in [src/styles/tokens.css](src/styles/tokens.css) with shadcn-vue names:
  `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`,
  `destructive` (each with `-foreground`), `border`, `input`, `ring`, `radius`. Use them through
  Tailwind utilities (`bg-primary`, `text-muted-foreground`, `border-input`, `rounded-lg`).
  No hex values in templates. Light theme only.
- `border` is decorative; `input` (#8c8176) is the form-control border with ≥ 3:1 contrast.
- UI font: Be Vietnam Pro 400/500/600/700 from `@fontsource/be-vietnam-pro` (OFL-1.1, license in
  the package), with latin, latin-ext and vietnamese subsets and a system fallback stack.

## Adding or changing a component

Follow `.claude/skills/shared-ui-component/SKILL.md`: inspect callers, keep one public API per
component, update this guide, the playground and `src/index.ts`, and run the checks.

shadcn-vue primitives live in `src/components/ui` and use relative imports (the package is
consumed as source, so path aliases would not resolve in consuming apps). `components.json` is
configured for this package; after `npx shadcn-vue@latest add <name>` from `packages/ui`, rewrite
generated `@ui/...` imports to relative paths and remove `dark:` classes.
