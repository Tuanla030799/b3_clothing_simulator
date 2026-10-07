# Lituta — Thiết kế bộ quà

Frontend tool for choosing newborn clothing/accessories, personalizing each item with a name or
logo, arranging the set on a background and downloading an image. V1 is frontend-only.

**Current state: Phase 5 (V1 flow complete)** — choose items → personalize each item → view the
whole set arranged on a background → download it as a PNG. The selection and designs live only in
the page: **reloading the page loses the set**. See [Not implemented yet](#not-implemented-yet).

Around the tool there is a site shell (announcement bar, header, footer) and a home page being built
in phases; see [docs/homepage-plan.md](docs/homepage-plan.md) (**all phases H1–H5 done**).

Repository rules: [AGENTS.md](AGENTS.md). Component guide: [packages/ui/README.md](packages/ui/README.md).

## Requirements and commands

Node.js ≥ 20.19 (developed on 24.11) and Yarn 3.8.7 (pinned in `package.json`).
One `yarn.lock` at the root; do not use another package manager.

```bash
corepack enable      # enable the pinned Yarn version
yarn install         # install all workspaces
yarn dev             # client dev server (http://localhost:5173)
yarn typecheck       # vue-tsc for every workspace
yarn lint            # ESLint (Vue + TypeScript)
yarn format:check    # Prettier check (yarn format to write)
yarn test            # Vitest in every workspace
yarn build           # typecheck + production build of the client (apps/client/dist)
yarn preview         # serve the production build
yarn check           # all of the above in sequence
```

Yarn uses `node_modules` via `.yarnrc.yml`. Commit `yarn.lock`; use
`yarn install --immutable` for reproducible installs in CI. Local Yarn caches are ignored.

### UI playground (development only)

Run `yarn dev` and open <http://localhost:5173/?playground>. It shows every common component
and the states to verify (grid, buttons, image fallback, form wiring, select, dropdown…).
It is loaded through a dynamic import guarded by `import.meta.env.DEV`, so it is not part of the
production bundle and has no link in the customer UI. No router is used.

`/?harness=backgrounds` (development only, same mechanism) opens the real designer with generated
test backgrounds — wide 1200×600, tall 600×1200, square 900×900 and one that fails to load — to try
background choice and export with other aspect ratios and a failing background. Its images are
created at runtime in [apps/client/src/dev/BackgroundHarness.vue](apps/client/src/dev/BackgroundHarness.vue)
and are not in the catalog or in the production bundle.

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
| Canvas    | konva 10.7.1, vue-konva 4.0.1 (client only; loaded lazily with the editor / set view)                                                       |
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
  `src/assets/products` (`suit`, `suit-2`, `khan`, `mu`, `yem`, `bao-tay`: product id = file name,
  underscores become `-`). **Provisional**: names, embroidery zones and display scales are
  estimates and every entry has `provisional: true`; zones were placed by eye on these images and
  are not workshop-approved. The product images are transparent PNG cut-outs (RGBA, 1448×1086).
- Selection rules: `maxItems: 10`, `categoryLimits: { shirt: 3 }` — matched by **category id**,
  never by display name. Both bodysuits belong to `shirt`. No other category limits are defined.
- A `Product` is one model + one color (no variants). `productId` identifies the catalog
  product; each addition to the set is a separate item with its own `instanceId`.

### Adding images

Put user-provided files (product images without embroidery, PNG/WebP with a real transparent
background) in:

| Folder                                | File name                                    |
| ------------------------------------- | -------------------------------------------- |
| `apps/client/src/assets/products/`    | `<product id>.<png\|webp\|jpg\|jpeg\|avif>`  |
| `apps/client/src/assets/backgrounds/` | `<background id>.<ext>` (default: `anh-nen`) |
| `apps/client/src/assets/designs/`     | `<preset id>.<ext>` (also `svg`)             |

Files are discovered with `import.meta.glob` in
[data/assets.ts](apps/client/src/features/designer/data/assets.ts), so production URLs are hashed
by Vite and a missing file simply means `src: undefined` → placeholder (no broken import or
request). Placeholders are never exportable product images. File names are normalized to ids
(lower case, spaces/underscores → `-`), e.g. `suit_2.png` → `suit-2`. If you rename a file, rename
the product id in the catalog to match (or the product shows a placeholder).

When a real image is added, record its intrinsic `width`/`height` in the product `image` and
replace provisional zones/scale with measured values, then set `provisional: false`.

### Embroidery zones

`EmbroideryZone { id, name, x, y, width, height, allowedContent: ('text' | 'image')[] }`.
Coordinates are normalized 0–1 to the **full source image** (origin top-left), independent of
the viewport and of where the product is placed in the composition. A zone must stay inside the
image (`x + width ≤ 1`, `y + height ≤ 1`); `catalog.test.ts` checks these invariants.

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
  it is **not** a composition of the set.
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

- Zones are estimates placed by eye on the current PNGs (`suit` has two: “Ngực áo”, “Thân dưới”);
  none are workshop-approved.
- Product images are transparent PNG cut-outs, so the set view and the export composite them on the
  background. Each item's layout box is still its **whole image rectangle** (transparent margins
  included), so garments look smaller than their boxes; sizing from the visible (alpha) bounds
  would be a separate decision.

## Set view (Phase 4)

Code: `setLayout.ts` (pure layout), `useComposition.ts` (view mode, background, readiness),
`productContent.ts` (shared item renderer), `components/CompositionCanvas.vue`,
`components/CompositionPanel.vue`; tests in `setLayout.test.ts` and `composition.test.ts`.

### Using it

- “Từng món” / “Cả bộ” in the preview switches between the item editor and the whole set (step 3
  “Xem cả bộ” becomes current). On mobile the “Bố cục” tab shows the set (gift-set list + set
  panel) and “Thiết kế” returns to the editor; adding items never changes the tab.
- The set panel replaces the layer tools: background choice (thumbnails when the catalog has more
  than one background, otherwise its name), readiness status with “Thử lại”, and the item list with
  “Chỉnh” to edit that item in the editor. Edits appear in the set immediately when switching back.
- The set view is read-only (no drag/resize of items yet); the page scrolls normally over it.
  Only one canvas is mounted at a time (editor or set). An empty set shows the EmptyState.

### Composition and placement contract

```ts
// Logical composition size: width COMPOSITION.logicalWidth (1200); height from the decoded
// background aspect. No usable background → COMPOSITION.fallbackSize (1200 × 900, provisional).
interface Placement { instanceId: string; x: number; y: number; width: number; height: number } // top-left, logical units
interface SetLayout { size: { width; height }; placements: Placement[]; strategy: 'rows' | 'grid' }
interface LayoutItem { instanceId; aspectRatio; displayScale; priority }
layoutSet(items, size, { paddingRatio, gapRatio, maxItemFill }): SetLayout   // pure, deterministic

const composition = useComposition(selection, designs)   // DesignerPage; provideComposition / injectComposition
composition.mode            // 'item' | 'set'
composition.layout          // computed SetLayout (derived, never stored)
composition.size / background / backgroundEntry / backgroundError / pendingBackgroundId
composition.selectBackground(id) / retry() / showSet() / editItem(instanceId)
composition.issues / status // 'empty' | 'loading' | 'ready' | 'incomplete'
```

- A placement box has the product image aspect ratio; the product image fills it exactly and the
  item's zones/designs are drawn inside with `buildProductContent` — the same function the editor
  uses, so design-to-product proportions are identical in both views.
- Rendering in the set view: layer `background` (image scaled to the stage, or a neutral rect),
  layer `set` (scaled once from logical units; one group per item, id `set-<instanceId>`, with the
  product image then per-zone clipped groups of image/text layers). No zone outlines, transformer
  or handles exist in this view. Designs are only read, never changed.
- The stage is sized from the container width; only the layer scale changes on resize.

### When the layout changes

| Change                                                                      | Layout recomputed?             |
| --------------------------------------------------------------------------- | ------------------------------ |
| Item added / removed (incl. repeats)                                        | yes                            |
| Background with another aspect ratio                                        | yes (new composition size)     |
| A product image finishes decoding with a different aspect than its metadata | yes, with the verified size    |
| Text, color, image or transform of a design                                 | no — content only              |
| Viewport / container resize, tab or mode switch                             | no — display scale only        |
| Order in which images finish decoding                                       | no — final inputs are the same |

### Size convention (`displayScale`) and the layout heuristic

- Item base box: aspect `a` = decoded product image width / height (catalog metadata, then
  `COMPOSITION.placeholderAspect`, until decoded); visual size `s = displayScale`, taken as the
  geometric-mean side `√(width·height)`: `width = s·√a`, `height = s/√a`. One factor `u` scales all
  boxes, so displayScale ratios hold and nothing is distorted. These are relative display sizes,
  not physical measurements (current values are provisional estimates; no centimetres exist yet).
- Order: `COMPOSITION.categoryPriority` (shirt 2, towel 1, others 0; configuration, not product
  ids), then larger visual size, then add order.
- Every split of that order into consecutive rows is tried (≤ 512 for 10 items). Each gets the
  largest `u` that fits all rows inside the composition minus padding (4% of the shorter side)
  with gaps (2.5%), capped so the tallest item uses at most 75% of the usable height. Score =
  `u × (1 − 0.2 × row-width imbalance)`; the first best candidate wins (deterministic). Rows and
  items are centred; in each row the most important item is in the middle.
- Guarantees (tested for 1–10 items, landscape/portrait/square compositions, tall/wide/square
  images, repeats): every instance once, inside the padded area, aspect kept, no overlapping
  boxes, at least one gap between boxes, no NaN/negative sizes.
- Fallback: if no row split is valid, a grid of equal cells places every item (contained in its
  cell). Items are never rotated.
- Limits: boxes include the empty margins of the product photos, so items can look smaller than
  they are; the layout aims at correctness and stability, not a natural photo arrangement.

### Resources in the set view

- Product images, preset images, fonts and uploaded images are loaded and owned by `useDesigns`
  (shared caches; one decode per source, not per instance). The set view only borrows them and
  never creates or revokes object URLs, so switching views keeps uploads; replacing/removing an
  image or an item still releases its URL as in Phase 3.
- Only background images are loaded by the composition (bundled assets; nothing to revoke). A new
  background replaces the current one only after it decoded; on failure the previous one stays
  (or the neutral fallback) with a message; an older load finishing late is ignored.
- Text is drawn only when the lettering font is confirmed for that content; images only when
  decoded. Anything missing is listed (“Bộ chưa hiển thị đầy đủ”) with “Thử lại”; an item whose
  product image is missing keeps its place as a labelled placeholder. Removed items never return.
- Only the selected items' resources are loaded, when the set view is shown.

### Assets still needed for visual acceptance

The set view and the export work with the current files, and the product images are now real
transparent cut-outs. It is still **not** visually accepted: the background and the preset image
(`designs/icon.jpeg`, an opaque JPEG that shows as a grey box on a garment) carry marks or opaque
backgrounds, and approved backgrounds, verified display scales, embroidery zones and thread colors
are still needed before judging the look.

## Downloading the image (Phase 5)

Code: `exportImage.ts` (size, name, offscreen renderer, downloader), `useExport.ts` (readiness,
lock, flow), `setScene.ts` + `sceneInput.ts` (shared scene), `editLock.ts`,
`components/ExportStatus.vue`; tests in `export.test.ts` and `exportImage.test.ts`.

### How to download

1. Add items, personalize them, switch the preview to **“Cả bộ”**.
2. Press **“Tải ảnh”** in the header. It is enabled only in “Cả bộ” and only when the set is ready;
   otherwise a short reason is shown under the preview toolbar (also on mobile): empty set, switch
   to “Cả bộ”, resources still loading or failed (“Tải lại tài nguyên”), a background that failed,
   a text edit being applied or refused.
3. The button shows “Đang tạo ảnh…” while working and ignores further presses. On success the
   status says “Đã bắt đầu tải ảnh.” (the app cannot know whether the browser saved the file); on
   failure a Vietnamese message and “Thử tải lại” appear and the set is unchanged.
4. There is no confirmation dialog. The “Từng món” view never downloads a single item.

### Output

- PNG, long edge **2400 px** (`EXPORT.longEdge` in `data/designOptions.ts`), the other edge rounded
  from the composition aspect ratio (error < 1 px). Examples: 1200×655 → 2400×1310, 1200×1800 →
  1600×2400, square → 2400×2400. Size comes from the logical composition only — never from CSS
  size, viewport or devicePixelRatio (desktop, 2× tablet and 3× phone exports of the same set were
  pixel-identical in testing). It does not add detail the source images do not have, and it is not
  an embroidery-machine file.
- The background is included exactly as previewed (the PNG is opaque). The background fills the
  whole canvas; items are drawn with one uniform scale, so no item is stretched.
- File name `lituta-bo-qua-YYYYMMDD-HHmmss.png` (local time), never containing names or text.

### Export readiness (one check for the button, the status text and `run()`)

`useExport.block` is `null` only when all hold: the preview is “Cả bộ”; the set has items; no text
edit is being processed (`pending-edit`) and no refused edit (too long, font error) is still
shown in its textarea (`invalid-edit` — the older stored text is never exported silently);
the **chosen** background is loaded (a failed switch keeps showing the old background in the
preview but blocks export; the neutral fill is exported only when no background is configured at
all); every product image, preset/uploaded image and font is ready (a missing product image
shows a placeholder in the preview but is never exported); every item has exactly one placement;
and no export is running. `run()` checks it again itself, confirms the lettering font with
`document.fonts.load`, checks again, then builds the scene and fails with a typed error if any
resource is missing.

### Snapshot, lock and renderer

- `run()` takes the **edit lock** (`selection.lock`) before its first `await`. While it is held,
  adding/removing/selecting items, every design edit (text, color, images, transforms) and
  changing the background are refused by the functions themselves; the matching buttons and the
  editor fieldset are also disabled. The lock is released in `finally` (success, failure,
  unmount).
- The snapshot is `captureSceneInput()` → `buildSetScene()`: the same functions that feed the
  preview, so preview and file cannot disagree. It references the immutable `DesignState` of that
  moment, decoded images and text layouts; nothing is cloned, and DesignState is never mutated.
- `renderSceneToBlob()` builds a **detached** Konva stage (1×1 stage size, so layer buffers stay
  tiny on high-DPR phones) with only a `background` layer and a `set` layer — no zone outlines,
  transformer, handles or placeholders — and rasterises it with `toCanvas({ width, height,
pixelRatio: 1 })` to a Blob. No DOM capture, screenshot or preview bitmap is used. The temporary
  stage and canvas are released in `finally`.

### Resource ownership and cleanup

- Decoded product/preset/upload images and upload object URLs stay owned by `useDesigns`;
  the background by `useComposition`. The exporter only borrows decoded images and never revokes
  those URLs.
- The exporter owns the temporary stage/canvas, the Blob and the download object URL. The URL is
  revoked after 60 s (`EXPORT.downloadUrlTtlMs`) — not at click time — and all remaining ones are
  revoked on unmount. An unmount during an export skips the download and UI updates.

### Contract to keep when changing the export

- Keep `buildSetScene`/`captureSceneInput` as the single source of positions and content for both
  the preview and the exporter; keep layers `background` and `set` free of UI.
- Do not export from a state `exportReadiness` rejects; do not weaken the lock.
- Keep export size derived from the logical size.

### Browsers and tests used

Automated: `yarn test` (export readiness, lock, snapshot, errors, cleanup, size, file name, scene).
Manually driven with Playwright (Chromium, desktop): real downloads at 1440 px; desktop/768 px
(2× DPR)/375 px (3× DPR, mobile emulation with touch — **emulated, not a physical phone**) exports
decoded with PIL; a set of 1, 5 and 10 items; two same-model shirts with different names, white and
dark text, multi-line text, several zones, uploaded + preset images; rapid double click; slow
export with the lock visible; null-Blob and tainted-canvas failures with retry; wide/tall/square and
failing backgrounds with the harness; delete/replace item then re-export. Firefox and Safari were
not tested.

### Known limits and provisional data

- Product images are transparent PNGs and appear in the file with transparency composited on the
  chosen background. Functional acceptance is done; **visual acceptance is not**: approved
  backgrounds and preset images, embroidery zones and `displayScale` values are still needed.
- The background is drawn with default image smoothing; very large uploaded images drawn small
  may look slightly aliased.
- A canvas that the browser marks tainted cannot be exported; images here are same-origin/blob so
  this should not occur. There is no proxy or server fallback by design.
- Reloading the page loses the whole set and its designs.

## Site shell and routes (home page, phase H1)

Code: [router.ts](apps/client/src/router.ts), [features/site](apps/client/src/features/site),
[pages](apps/client/src/pages). Plan and later phases: [docs/homepage-plan.md](docs/homepage-plan.md).

- Routing uses `vue-router` (history mode, `base` from Vite's `BASE_URL`; in development the app is
  served under `http://localhost:5173/b3_clothing_simulator/`).
- Routes: `/` home, `/thiet-ke` the design tool (loaded on demand, no site footer), and one shared
  “coming soon” page for menu targets that are not built (`/san-pham`, `/bo-suu-tap`,
  `/tra-cuu-don-hang`, `/gio-hang`, `/lien-he`, `/ve-chung-toi`); unknown paths show a not-found
  page. Route `meta.title` sets the document title (`<page> – <default title>`).
- Layout (`SiteLayout`): skip link, dismissible announcement bar (session only), header (logo,
  4-item menu, cart link, hamburger menu below 768 px that closes with Escape/navigation and returns
  focus), `<main>` (focused after each navigation) and a footer with the top part only.
- Announcement, menu and footer content are **mock data** in
  [features/site/data/siteData.ts](apps/client/src/features/site/data/siteData.ts) with types in
  `features/site/types.ts`; replace the source with backend data later without touching components.
  Texts avoid promotions, prices and shipping claims; social links point to platform home pages.
- Site components use the shared `Flex` (`as="ul"` for lists, native `<li>` children) and `Link`
  (`as="RouterLink"` for routes, `external` for outside links) instead of `flex` classes and bare
  `<a>`; see the component guide.
- Home page sections so far: banner, commitments bar, featured products, seasonal collections, process and reviews (below), polished in phase H5.

### Home banner and commitments (phase H2)

Code: [features/home](apps/client/src/features/home) (`HomeBanner.vue`, `CommitmentsBar.vue`,
`data/homeData.ts`, `data/assets.ts`).

- **Banner** uses Swiper (`swiper/vue`, only the `A11y` and `Keyboard` modules plus the base CSS).
  3 mock slides with a text card (title, description, button) over the image. Auto-advance
  (6 s) uses our own timer: off when the visitor prefers reduced motion, held while the banner is
  hovered or contains focus, restarted after every slide change, and always stoppable with the
  visible pause button. Arrows (from 640 px), dots, swipe and the arrow keys also navigate. Slides
  that are not shown are `inert`, so their buttons are not reachable with Tab.
- **Commitments** are 4 fixed items written in code (not backend data), without delivery or
  shipping claims; the wording is to be confirmed.
- **Images** are found by file name without extension in `apps/client/src/assets/home/`
  (`banner-1`, `banner-2`, `banner-3`; png/jpg/jpeg/webp/avif). A missing file shows a placeholder.
  A file directly in `assets/home/` overrides one of the same name in `assets/home/_reference/`.
- **Reference images:** `assets/home/_reference/` is **git-ignored** and holds third-party images
  used only for local mockups. They are never committed, so CI and the GitHub Pages deploy build
  with placeholders. Before the site goes public, put your own (or licensed) images in
  `assets/home/` or serve them from the backend.

### Featured products and seasonal collections (phase H3)

Code: `features/home/components/FeaturedProducts.vue`, `SeasonalCollections.vue`,
`SectionHeading.vue`; data in `features/home/data/homeData.ts`.

- **Featured products** are read from the design catalog by id (`featuredProductIds`; ids that are
  not in the catalog are skipped, nothing is copied). Each card is one `Link` to `/thiet-ke` with the
  product image (transparent PNG), name and category. No prices are shown because no price data
  exists. 2 columns on phones, 3 from 768 px.
- **Seasonal collections** (`seasonalCollections`, mock): Giáng sinh, Tết, Trung thu, Mùa hè, Mùa thu,
  Mùa đông. Each card links to `/bo-suu-tap/<slug>`, a route that shares the “coming soon” page
  for now (the “Bộ sưu tập” menu item stays highlighted). Cards use an image named by `image` (file
  in `assets/home/`) or a placeholder with an icon; the name sits on a light strip so it stays
  readable over any image. 2 columns on phones, 3 from 768 px, 6 from 1024 px.
- Section titles are `h2` with `aria-labelledby` on the section.

### Process and reviews (phase H4)

Code: `features/home/components/ProcessSection.vue`, `ReviewsSection.vue`; data in
`features/home/data/homeData.ts` (`processSteps`, `reviews`).

- **Process:** 4 steps (choose product → choose color and size → design if wanted → confirm the
  order) as an ordered list: image (file `process-1`…`process-4` in `assets/home/`, otherwise an
  icon placeholder), number, title and description. One button goes to `/thiet-ke`. The steps
  describe the intended buying flow; color/size choice and ordering are not built yet, so no step
  has its own action. Wording is to be confirmed.
- **Reviews:** 3 mock cards with a star rating (`role="img"`, “N trên 5 sao”), text, author and
  product. A review with `isSample: true` shows a **“Dữ liệu mẫu”** tag, and the section shows a note
  while any sample review exists, so real data (with `isSample: false`) removes the labels without
  code changes. No average rating or review count is shown because no real numbers exist.
- Layout: steps 1 / 2 / 4 columns (phone / 640 px / 1024 px), reviews 1 / 3 columns (phone / 768 px).

### Quality notes for the home page (phase H5)

- **Bundle:** the home page is a lazy route, so Swiper (and the banner/sections code) is not
  downloaded by other pages such as the design tool. After H5 the main entry chunk is about 81 kB
  (29 kB gzip) and the home chunk about 112 kB (35 kB gzip); Konva is still loaded only with the
  design tool. Images use the common `Image` (lazy by default, the first banner slide eager) inside
  frames with fixed aspect ratios, so loading does not shift the layout.
- **Product images:** the product PNGs are 0.7–1.2 MB each and the home page shows six of them
  (lazy-loaded, below the fold). Serve resized/optimized versions from the backend or CDN before
  going public.
- **Motion:** with `prefers-reduced-motion` the banner does not auto-advance (the pause/play button
  can still start it), slide changes are instant, and card hover transitions are disabled.
- **Accessibility checked** with axe-core (WCAG 2.0/2.1 A and AA plus best practices) on the home
  page (desktop and phone width), the design tool and the “coming soon” / not-found pages, using the
  Playwright browser: no violations. Every page has one `h1` (visually hidden on the home page and
  the placeholder pages), landmarks are header / main / footer with labelled navigation, there is a
  skip link, and the banner, menu and cards work with the keyboard. axe-core is not a project
  dependency; it was loaded from a CDN for the check. Not verified: real screen readers and real
  devices.
- **Tests** (`yarn test`): data guards (`home.test.ts`, `router.test.ts`: every link resolves, ids
  are unique, catalog ids exist, ratings valid, sample reviews flagged) and behaviour tests that run
  in jsdom: the mobile menu (`SiteHeader.test.ts`: open/close, Escape returns focus, closes on
  navigation, current page marking) and the banner (`HomeBanner.test.ts`: 6 s timer, restart after
  any slide change, hold on hover/focus, pause/play, reduced motion, unmount cleanup; Swiper is
  replaced by a small stub there).

## Not implemented yet

Exporting other formats or sizes, sharing/saving to the photo library, PDF, manual moving/resizing
of items in the set,
saving a layout, applying a design to the whole set, undo/redo, more than one text and one image
per zone, multi-select and layer reordering, choosing fonts, thread/fabric/lighting simulation,
background removal, persistence of the selection or designs, customer zone editing, API or mock API, admin app,
Docker/CI/deploy. Out of V1 scope entirely: accounts, cart, payment, ordering, uploading logos to
a server, saving designs across reloads, realistic thread simulation.
