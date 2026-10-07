# Lituta — Thiết kế bộ quà

Frontend tool for choosing newborn clothing/accessories, personalizing each item with a name or
logo, arranging the set on a background and downloading an image. V1 is frontend-only.

**Current state: Phase 3** — on top of the foundation (Phase 1) and gift-set selection (Phase 2),
customers personalize each selected item: per embroidery zone one text block and one image
(preset or uploaded from the device), moved, resized and rotated on a canvas or with equivalent
controls. Arranging the set and exporting are not built yet. See
[Not implemented yet](#not-implemented-yet).

Repository rules: [AGENTS.md](AGENTS.md). Component guide: [packages/ui/README.md](packages/ui/README.md).

## Requirements and commands

Node.js ≥ 20.19 (developed on 24.11) and npm. One `package-lock.json` at the root; do not use
another package manager.

```bash
npm install            # install all workspaces
npm run dev            # client dev server (http://localhost:5173)
npm run typecheck      # vue-tsc for every workspace
npm run lint           # ESLint (Vue + TypeScript)
npm run format:check   # Prettier check (npm run format to write)
npm test               # Vitest in every workspace
npm run build          # typecheck + production build of the client (apps/client/dist)
npm run preview        # serve the production build
npm run check          # all of the above in sequence
```

### UI playground (development only)

Run `npm run dev` and open <http://localhost:5173/?playground>. It shows every common component
and the states to verify (grid, buttons, image fallback, form wiring, select, dropdown…).
It is loaded through a dynamic import guarded by `import.meta.env.DEV`, so it is not part of the
production bundle and has no link in the customer UI. No router is used.

## Workspaces

| Path          | Package          | Role                                                           |
| ------------- | ---------------- | -------------------------------------------------------------- |
| `apps/client` | `@lituta/client` | Customer app (Vue 3 + Vite)                                    |
| `packages/ui` | `@lituta/ui`     | Shared UI for client and the future admin app (source exports) |

- Apps import UI only via `@lituta/ui` and `@lituta/ui/styles.css`.
- The UI package never imports app code, catalog data, routers, stores or API clients.
- Dependencies are declared in the workspace that uses them; `vue` is a peer dependency of the
  UI package so a single Vue runtime is installed.
- No admin app, backend, router, state library or HTTP client yet.
- Ant Design Vue `Table` will be installed directly in the app that needs it; there is no shared
  Table wrapper.

### Stack (installed versions)

| Area      | Packages                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | vue 3.5.43, vite 8.3.3, @vitejs/plugin-vue 6.0.9                                                                                            |
| Types     | typescript 6.0.3 (strict), vue-tsc 3.3.12                                                                                                   |
| Styling   | tailwindcss / @tailwindcss/vite 4.3.3, tw-animate-css 1.4.0                                                                                 |
| UI        | shadcn-vue (new-york-v4 templates) on reka-ui 2.11.0, class-variance-authority 0.7.1, clsx 2.1.1, tailwind-merge 3.7.0, @vueuse/core 14.4.0 |
| Canvas    | konva 10.7.1, vue-konva 4.0.1 (client only; loaded lazily with the editor)                                                                  |
| Icons     | @lucide/vue 1.52.0 (successor of the deprecated lucide-vue-next)                                                                            |
| Fonts     | @fontsource/be-vietnam-pro 5.3.0, @fontsource/dancing-script 5.3.0                                                                          |
| Quality   | eslint 10, typescript-eslint 8.71, eslint-plugin-vue 10.11, prettier 3.9, vitest 5.0.3, @vue/test-utils 2.5, jsdom 29                       |

TypeScript stays on 6.0 because typescript-eslint supports `<6.1`. jsdom stays on 29 because
jsdom 30 requires Node ≥ 24.15.

## Design tokens, fonts and grid

- Tokens: [packages/ui/src/styles/tokens.css](packages/ui/src/styles/tokens.css). Palette:
  background #FAF7F2, card #FFFFFF, primary #456454, secondary/accent #F3E3DF, foreground
  #302C29, border #E5DED5 (plus muted, input, ring, destructive). Light theme only.
- Tailwind v4 scans the client (`apps/client/src`) and the UI package (`@source` in
  `packages/ui/src/styles/index.css`). Use static class names only — no interpolated classes.
- UI font: **Be Vietnam Pro** 400/500/600/700, owned by `@lituta/ui`.
- Design lettering: **Dancing Script** 600, owned by the client
  ([apps/client/src/styles/main.css](apps/client/src/styles/main.css)), Tailwind class
  `font-design`.
- Both fonts are bundled locally from Fontsource (Google Fonts sources, SIL OFL 1.1, license files
  in `node_modules/@fontsource/*/LICENSE`). The actual font files were checked to contain every
  glyph of “Nguyễn Minh”, “Bảo Ngọc”, “Đậu”.
- Grid: Row/Col with 24 columns, gutters in px, breakpoints xs (base), sm 640, md 768, lg 1024,
  xl 1280, xxl 1536 (= Tailwind `2xl`).

> **For the export phase:** fonts load lazily. Before measuring text or exporting an image, call
> `await document.fonts.load('600 32px "Dancing Script"', text)` and verify
> `document.fonts.check(...)`; never silently export with a fallback font.

## Catalog data, images and embroidery zones

Code: [apps/client/src/features/designer](apps/client/src/features/designer).

- [types.ts](apps/client/src/features/designer/types.ts) — `Category`, `Product`,
  `EmbroideryZone`, `Background`, `DesignPreset`, `SelectionRules`.
- [data/catalog.ts](apps/client/src/features/designer/data/catalog.ts) — local development data:
  categories shirt (Áo), towel, hat, bib, mittens and six products backed by the images in
  `src/assets/products`. **Provisional**: names, embroidery zones and display scales are estimates
  and every entry has `provisional: true`. The provided images are 1024×768 JPEGs with the
  checkerboard drawn into the pixels (no real transparency), and some carry a corner watermark;
  they are used to test selection only and are **not** export-ready product images.
- Selection rules: `maxItems: 10`, `categoryLimits: { shirt: 3 }` — matched by **category id**,
  never by display name. Both bodysuits belong to `shirt`. No other category limits are defined.
- A `Product` is one model + one color (no variants). `productId` identifies the catalog
  product; each addition to the set is a separate item with its own `instanceId`.

## Gift-set selection (Phase 2)

Code: [selection.ts](apps/client/src/features/designer/selection.ts) (pure rules),
[useSelection.ts](apps/client/src/features/designer/useSelection.ts) (state),
tests in [selection.test.ts](apps/client/src/features/designer/selection.test.ts).

Behaviour:

- **Add** (`+` on a product): allowed while the set has fewer than `maxItems` items and the
  product's category (if it has a limit) is below its limit. Repeats count. When both limits are
  reached the total limit is reported first. Blocked buttons are disabled and show a short reason
  under the product name (e.g. “Tối đa 3 món loại áo”, “Bộ đã đủ 10 món”). The add itself
  re-checks the rules, so the button state is never the only guard. A new item is appended,
  becomes active, and the current mobile tab is kept.
- **Select**: click or keyboard on an item in “Bộ đồ đã chọn”; the active item is marked with
  border, a check icon, “Đang chỉnh” text and `aria-current`.
- **Remove**: the trash button of an item (accessible name “Xóa món N: <name>”). Removing the
  active item activates the following item, else the previous one, else nothing. Focus moves to
  the remove button now at the same position, or to the panel heading when the set is empty.
  No confirmation and no “remove all”. Removing an item also discards its design (see below).
- Displayed numbers (“Món N”) are current positions and may change after a removal; instance
  ids never change.
- Counters (“Tổng x/10”, “Áo y/3”) are derived from the selected items.
- Preview shows the active item with its design (see the editor below) or the empty background —
  it is **not** a composition of the set. “Tải ảnh” stays disabled.
- Layout: lg+ has products | preview above the gift set | personalization. Mobile shows the
  preview, then tabs Sản phẩm / Thiết kế / Bố cục (the gift set). Panels stay mounted when hidden.
- State lives only for the session (page lifetime); a reload starts with an empty set. Nothing is
  persisted.

### Selection contract

```ts
// selection.ts — pure, never mutates input
interface SelectedItem { readonly instanceId: string; readonly productId: string }
interface SelectionState { readonly items: readonly SelectedItem[]; readonly activeInstanceId: string | null }
interface SelectionCatalog { readonly products: readonly Product[]; readonly rules: SelectionRules }
type AddBlockReason =
  | { code: 'unknown-product' }
  | { code: 'max-items'; limit: number }
  | { code: 'category-limit'; categoryId: CategoryId; limit: number }
type AddCheck = { ok: true; product: Product } | { ok: false; reason: AddBlockReason }
checkCanAdd(items, productId, catalog): AddCheck
addItem(state, productId, catalog, createId): { state; check; instanceId? }
selectItem(state, instanceId): SelectionState   // unknown id → same state
removeItem(state, instanceId): SelectionState   // unknown id → same state
selectedCategoryIds(items, catalog): CategoryId[] // one entry per item, repeats included

// useSelection.ts — one independent state per call; DesignerPage calls it and provides it
const selection = useSelection({ catalog?, createId? })
selection.items / activeInstanceId / entries / activeEntry / selectedCategoryIds // computed
selection.entries: { item, product, position }[]  // joined with the catalog, in add order
selection.canAdd(productId) / add(productId) / select(instanceId) / remove(instanceId)
provideSelection(selection); injectSelection() // in descendants of DesignerPage
```

UI messages for blocked adds live in
[addBlockMessage.ts](apps/client/src/features/designer/addBlockMessage.ts).

## Personalization editor (Phase 3)

Code (all in `apps/client/src/features/designer`):

| File                                                                | Responsibility                                                                      |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `design.ts`                                                         | Plain design data and pure updates (`setLayer`, `removeInstanceDesigns`, …)         |
| `geometry.ts`                                                       | Pure coordinate maths: contain fit, zone rects, rotated bounds, clamp/resize/rotate |
| `textLayout.ts`                                                     | Font loading check and ink-based text layout (diacritics never cropped)             |
| `imageFiles.ts`                                                     | Upload validation (signature, size, header dimensions) and `window.Image` decoding  |
| `useDesigns.ts`                                                     | Design state, active zone/layer, runtime resources, async race handling             |
| `data/designOptions.ts`                                             | Text colors, lettering font, upload and size limits                                 |
| `components/DesignCanvas.vue`                                       | The single Konva editor inside the preview                                          |
| `components/TextEditor.vue`, `ImagePicker.vue`, `LayerControls.vue` | Panel controls                                                                      |

### Using the editor

1. Add an item and select it. The editor shows its product image with dashed zone outlines; the
   remembered zone of that item (or its first zone) is active. Items without zones show
   “Món này chưa hỗ trợ cá nhân hóa”. Zones that do not allow images hide the image section.
2. **Text**: type in “Nội dung” (Enter = new line). The first text is centred and fitted to the
   zone; later edits keep its position/rotation and only shrink it when needed to stay inside.
   Text that cannot fit at the minimum size is refused with a message and the last valid text
   stays. Blank text renders nothing. Pick a color from “Màu chữ”; “Xóa chữ” removes only the text.
3. **Image**: pick a preset or “Tải ảnh từ máy”. A new image replaces the old one only after it
   decoded successfully, then is centred and fitted (aspect kept). Failures show a Vietnamese
   message and keep the previous image. “Xóa hình” removes only the image. Images are drawn below
   text.
4. **Adjust**: tap/click a layer on the canvas (or “Chỉnh vị trí chữ/hình”) to select it. Drag to
   move, corner handles to resize proportionally, the top handle to rotate. The same actions are
   available as DOM controls (arrow buttons, “Căn giữa vùng”, size and rotation sliders with
   ± buttons, “Bỏ xoay”), which use the same bounds rules.

Text colors (`designOptions.ts`): Nâu đậm, Xanh navy, Xanh lá đậm, Hồng đất, Trắng — preview colors
only, not confirmed thread colors. The lettering font is fixed: Dancing Script 600.

### Design data contract (for arranging/export)

```ts
interface LayerTransform {
  x: number        // layer centre, fraction of the zone width (0–1)
  y: number        // layer centre, fraction of the zone height (0–1)
  height: number   // layer box height, fraction of the zone height
  rotation: number // degrees clockwise, (-180, 180]
}
interface TextDesign { content: string; fontId: 'dancing-script-600'; colorId: string; transform: LayerTransform }
type ImageSource =
  | { kind: 'preset'; presetId: string }
  | { kind: 'upload'; uploadId: string; fileName: string } // runtime resource, never uploaded
interface ImageDesign { source: ImageSource; aspectRatio: number /* width/height */; transform: LayerTransform }
interface ZoneDesign { text?: TextDesign; image?: ImageDesign }
type DesignState = Record<instanceId, Record<zoneId, ZoneDesign>>

const designs = useDesigns(selection)        // DesignerPage; provideDesigns / injectDesigns
designs.designs                               // computed DesignState (plain data only)
designs.zoneDesign(instanceId, zoneId)
designs.setText(instanceId, zoneId, content, colorId?) → 'ok' | 'cleared' | 'stale' | 'font-error' | 'too-long' | 'no-image'
designs.setTextColor / removeText / removeImage (instanceId, zoneId, …)
designs.setPresetImage(instanceId, zoneId, presetId) / setUploadImage(instanceId, zoneId, file) → 'ok' | 'stale' | UploadError | 'no-image'
designs.setTransform(instanceId, zoneId, kind, transform) → boolean (rejects invalid)
designs.layerTools.move / resize / rotate / center / limits(layer)
designs.textLayoutOf(content) / imageOf(source) / productImageState(product) // runtime render inputs
```

- The box width is `height × aspect`: the image `aspectRatio`, or for text the layout width/height
  measured with the lettering font (`textLayoutOf`). Text keeps no stored size other than
  `height`, so content + font + transform rebuild it exactly.
- UI selection (active zone per item, active layer) lives beside the data and is not design data.
- Designs are keyed by `instanceId`, so repeats of a product are independent.

### Coordinates, bounds and rendering

- Zones are fractions of the full source image. Layer transforms are fractions of their zone.
  Nothing is stored in viewport pixels, so resizing the preview or switching tabs never changes a
  design (verified at 1440/1024/768/375 px).
- The preview fits the **decoded** product image with “contain” (letterbox offsets included) and
  places zones on the drawn image. If catalog `width`/`height` differ from the decoded size, the
  decoded size is used and a development warning is logged; only the image aspect matters because
  designs are zone-relative.
- Invalid zones (outside the image or empty) are skipped with a development warning, never moved.
- Bounds always use the whole rotated box: dragging is clamped to the zone; resizing/rotating on
  the canvas is refused when the rotated box would leave the zone or become smaller than the
  minimum (image: 10% of zone height; text: font size 10% of zone height). DOM controls clamp
  size to [min, max] and move the centre when a rotation still fits, otherwise refuse. No flip,
  no negative or zero scale; the transformer keeps proportions. The zone clip in the canvas is
  only a visual safety net.
- Canvas layers: `product` (image), `design` (per-zone groups, image under text — export content),
  `ui` (zone outlines and transformer — never exported).
- The stage is only created when its container has a real size (hidden mobile panels report 0).
- Touch: a gesture that starts on a design layer or handle cancels page scrolling (non-passive
  `touchmove`); touches elsewhere on the canvas scroll the page normally.

### Fonts and resources

- Before measuring or storing text, `document.fonts.load('600 100px "Dancing Script"', text)` is
  awaited and the returned faces must be `loaded` and `document.fonts.check` true. Otherwise the
  edit returns `font-error`, nothing is stored and the panel offers “Thử lại”. Text is measured
  with `measureText` ink bounds, so stacked diacritics (Nguyễn, Bảo Ngọc, Đậu) fit the box.
- Uploads become local object URLs (no base64 in state, nothing sent to a server). An object URL
  is revoked when its image is replaced or removed, when its item is removed (any path — cleanup
  watches the selection), when a superseded or failed load finishes, and when the page unmounts.
  Preset URLs are bundled assets and are never revoked.
- Every async edit carries a token per item/zone/layer: only the latest edit may commit, and only
  if its item still exists — a slow load lands on the item that started it, never on the newly
  active one, and a removed item is never recreated.

### Upload limits

| Rule       | Value                                   | Why                                                                             |
| ---------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| Types      | PNG, JPEG, WebP (by file signature)     | SVG/GIF and renamed files are refused                                           |
| File size  | ≤ 10 MB                                 | read fully in memory for validation                                             |
| Dimensions | ≤ 4096 px per side and ≤ 4096 × 4096 px | a decoded 4096² image is ~64 MB RGBA; iOS Safari limits canvas area to ~16.7 MP |

Dimensions are read from the file header before decoding, and checked again after decoding.

### Provisional catalog and image limitations

- Zones are estimates. `bodysuit` has two zones (“Ngực áo”, “Thân dưới”) calibrated by eye against
  `Bodysuit.jpeg` for acceptance testing; none are workshop-approved.
- The product images are JPEGs whose checkerboard is part of the pixels (no alpha). The editor
  shows them as they are; they cannot be composited on a background until real cut-outs exist.

### Adding images

Put user-provided files (product images without embroidery, ideally PNG/WebP with a real
transparent background) in:

| Folder                                | File name                                    |
| ------------------------------------- | -------------------------------------------- |
| `apps/client/src/assets/products/`    | `<product id>.<png\|webp\|jpg\|jpeg\|avif>`  |
| `apps/client/src/assets/backgrounds/` | `<background id>.<ext>` (default: `anh-nen`) |
| `apps/client/src/assets/designs/`     | `<preset id>.<ext>` (also `svg`)             |

Files are discovered with `import.meta.glob` in
[data/assets.ts](apps/client/src/features/designer/data/assets.ts), so production URLs are hashed
by Vite and a missing file simply means `src: undefined` → placeholder (no broken import or
request). Placeholders are never exportable product images. File names are normalized to ids
(lower case, spaces/underscores → `-`), e.g. `Bodysuit_dai_tay.jpeg` → `bodysuit-dai-tay`.

When a real image is added, record its intrinsic `width`/`height` in the product `image` and
replace provisional zones/scale with measured values, then set `provisional: false`.

### Embroidery zones

`EmbroideryZone { id, name, x, y, width, height, allowedContent: ('text' | 'image')[] }`.
Coordinates are normalized 0–1 to the **full source image** (origin top-left), independent of
the viewport and of where the product is placed in the composition. A zone must stay inside the
image (`x + width ≤ 1`, `y + height ≤ 1`); `catalog.test.ts` checks these invariants.

## Not implemented yet

Arranging the items on the background, applying a design to the whole set, image export (the
“Tải ảnh” button stays disabled), undo/redo, more than one text and one image per zone, multi-select
and layer reordering, choosing fonts, thread/fabric simulation, multiple backgrounds selection,
persistence of the selection or designs, customer zone editing, API or mock API, admin app,
Docker/CI/deploy. Out of V1 scope entirely: accounts, cart, payment, ordering, uploading logos to
a server, saving designs across reloads, realistic thread simulation.
