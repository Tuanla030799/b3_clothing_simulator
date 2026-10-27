# Lituta — Thiết kế bộ quà

Frontend tool for choosing newborn clothing/accessories, personalizing each item with a name or
logo, arranging the set on a background and downloading an image. Data comes from the Lituta API
(separate repository `b3_clothing_simulator_api`).

**Current state: Phase 5 flow + API integration I1–I5** (see
[docs/api-integration-plan.md](docs/api-integration-plan.md)) — choose items → personalize each item → view the
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
yarn dev:admin       # admin dev server (http://localhost:5174)
yarn dev:all         # both dev servers in one terminal (stops both if one fails)
yarn typecheck       # vue-tsc for every workspace
yarn lint            # ESLint (Vue + TypeScript)
yarn format:check    # Prettier check (yarn format to write)
yarn test            # Vitest in every workspace
yarn build           # typecheck + production build of client and admin
yarn preview         # serve the production build
yarn check           # all of the above in sequence
```

Yarn uses `node_modules` via `.yarnrc.yml`. Commit `yarn.lock`; use
`yarn install --immutable` for reproducible installs in CI. Local Yarn caches are ignored.

Client and admin always run on separate origins (5173 and 5174 in development, separate domains in
production) so the admin's refresh token in `localStorage` is never readable by client scripts.

### Deployment

Each app is a static SPA build. `BASE_PATH` (build-time environment variable, with trailing slash,
default `/`) sets Vite's `base` for both apps.

- **GitHub Pages** ([deploy.yml](.github/workflows/deploy.yml)): builds the client only with
  `BASE_PATH=/b3_clothing_simulator/`.
- **Cloudflare Pages:** one project per app, both with the repository root as root directory and
  `BASE_PATH` unset (each app on its own domain, e.g. `lituta.vn` and `admin.lituta.vn`).

  | Project | Build command                                                      | Output directory   |
  | ------- | ------------------------------------------------------------------ | ------------------ |
  | client  | `corepack enable && yarn install --immutable && yarn build:client` | `apps/client/dist` |
  | admin   | `corepack enable && yarn install --immutable && yarn build:admin`  | `apps/admin/dist`  |

  Set `VITE_API_BASE_URL` per project (it is baked in at build time, so rebuild after changing
  it) and list both production origins in the API's `CORS_ORIGINS`. Without a `404.html`,
  Cloudflare Pages serves `index.html` for unknown paths, so history-mode routes load directly.
  Protecting the admin domain with Cloudflare Access is recommended.

### UI playground (development only)

Run `yarn dev` and open <http://localhost:5173/?playground>. It shows every common component
and the states to verify (grid, buttons, image fallback, form wiring, select, dropdown…).
It is loaded through a dynamic import guarded by `import.meta.env.DEV`, so it is not part of the
production bundle and has no link in the customer UI. No router is used.

`/?harness=backgrounds` (development only, same mechanism) opens the real designer with generated
test backgrounds — wide 1200×600, tall 600×1200, square 900×900 and one that fails to load — to try
background choice and export with other aspect ratios and a failing background. Its images are
created at runtime in [apps/client/src/dev/BackgroundHarness.vue](apps/client/src/dev/BackgroundHarness.vue)
and are not in the catalog or in the production bundle. Products still come from the API, so it needs
the API running.

## Workspaces

| Path          | Package          | Role                                                                       |
| ------------- | ---------------- | -------------------------------------------------------------------------- |
| `apps/client` | `@lituta/client` | Customer app (Vue 3 + Vite)                                                |
| `apps/admin`  | `@lituta/admin`  | Shop admin (Vue 3 + Vite + Ant Design Vue), see [Admin app](#admin-app-i5) |
| `packages/ui` | `@lituta/ui`     | Shared UI for client and admin (source exports)                            |

- Apps import UI only via `@lituta/ui` and `@lituta/ui/styles.css`.
- The UI package never imports app code, catalog data, routers, stores or API clients.
- Dependencies are declared in the workspace that uses them; `vue` is a peer dependency of the
  UI package so a single Vue runtime is installed.
- No state library. The backend is a separate repository; the client talks to it through
  [apps/client/src/api](apps/client/src/api) (see [API connection](#api-connection)), the admin
  through its own [apps/admin/src/api](apps/admin/src/api).
- Ant Design Vue is installed in the admin app only, for components `@lituta/ui` does not have;
  there are no shared wrappers around it.

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

## API connection

- Base URL: `VITE_API_BASE_URL` (e.g. `http://localhost:3000/api/v1`, see
  [apps/client/.env.example](apps/client/.env.example); put overrides in `apps/client/.env.local`).
  `yarn dev` falls back to `http://localhost:3000/api/v1`; a production build without it shows a
  configuration error on pages that load data. GitHub Pages reads the repository variable
  `VITE_API_BASE_URL`.
- The API must list the client origin in `CORS_ORIGINS` (JSON and `/uploads` images). Images drawn
  on canvases are requested with CORS; without it the PNG export would be blocked.
- [http.ts](apps/client/src/api/http.ts): `createApiClient({ baseUrl, fetch })` → `get(path,
{ query, signal })` returns the envelope's `data`; `getAll(path)` reads every page. Failures are
  `ApiError` (`kind` `config` | `network` | `http` | `invalid-response`, `status`, `code`,
  `requestId`, `errors`). `loadErrorMessage(error)` gives the Vietnamese message.
- [useRemoteData.ts](apps/client/src/api/useRemoteData.ts): `{ data, error, notFound, loading,
reload }`; [usePagedList.ts](apps/client/src/api/usePagedList.ts): `{ entries, total, loaded,
hasMore, loading, error, notFound, reset, loadMore }` for “Xem thêm” lists. In both the latest
  request wins and pending requests are aborted when the component unmounts.
- [publicCatalog.ts](apps/client/src/api/publicCatalog.ts): DTO types and calls for
  `public/categories`, `public/products` (+ `/:slug`, `/:slug/designer`), `public/designer/config`,
  `public/banners`, `public/collections` (+ `/:slug`, `/:slug/products`).
- Running the API locally: see its README (PostgreSQL in Docker, migrations, `npm run db:seed`,
  `npm run admin:create`, then create categories/products/colors/zones through the admin API).

## Catalog data, images and embroidery zones

Code: [apps/client/src/features/designer](apps/client/src/features/designer).

- [types.ts](apps/client/src/features/designer/types.ts) — `Category`, `Product`,
  `EmbroideryZone`, `Background`, `DesignPreset`, `SelectionRules`, `DesignerCatalog`.
- [catalog.ts](apps/client/src/features/designer/catalog.ts) — `loadDesignerCatalog()` reads the
  designer config, categories, every public product and each product's designer data. One API
  **product color** becomes one designer `Product`: `id` = color id, `productId` = product id,
  name “Product – Color”, `image` = the color's transparent `designImage` (URL and pixel size from
  the API), `displayScale` and `embroideryZones` from the color (empty when the designer is off for
  that color: it can be selected but not personalized). A product hidden between the list and the
  detail request (404) is skipped; any other failure fails the whole load.
- `DesignerPage` loads the catalog (loading state, error with “Thử lại”), then mounts
  `DesignerWorkspace`, which owns the session state. Components read the catalog with
  `injectCatalog()` and `useCategoryName()`.
- The design tool loads only the products in scope (`DesignerScope`): the cart's products (default)
  or one collection's (`?bo-suu-tap=<slug>`), never the whole catalog.
- Limits come from the config. `maxOrderItems` (API: 50) caps the order/cart and is the only limit
  that blocks adding. `maxItems` and per-category limits (keyed by the API **category id**, never
  by display name) cap the **set picture**. Categories form a tree (at most 3 levels, only leaves
  hold products): an item counts for its category and every ancestor, so a limit on a parent
  covers its whole branch, and each limit applies on its own (`catalog.categories` carries
  `parentId`; helpers in [categoryTree.ts](apps/client/src/features/catalog/categoryTree.ts)).
  `pictureIds` takes items in add order while they fit;
  the others are designed and ordered (`inPreview: false`) but not drawn, and a notice
  (`PictureNotice`) says so next to the download button and at checkout.
- Each addition to the set is a separate item with its own `instanceId`.
- There is no local catalog data any more. Catalog images, zones, scales, backgrounds and presets
  are managed through the admin API.

### Embroidery zones

`EmbroideryZone { id, name, x, y, width, height, allowedContent: ('text' | 'image')[] }`.
Coordinates are normalized 0–1 to the **full source image** (origin top-left), independent of
the viewport and of where the product is placed in the composition. A zone must stay inside the
image (`x + width ≤ 1`, `y + height ≤ 1`); the API enforces this and the client skips invalid zones.

## Gift-set selection (Phase 2)

Code: [selection.ts](apps/client/src/features/designer/selection.ts) (pure rules),
[useSelection.ts](apps/client/src/features/designer/useSelection.ts) (state),
tests in [selection.test.ts](apps/client/src/features/designer/selection.test.ts).

Behaviour:

- **Add** (`+` on a product): allowed while the set has fewer than `maxOrderItems` items. Repeats
  count. Picture limits never block adding (see above). Blocked buttons are disabled and show a
  short reason under the product name (“Đơn đã đủ 50 món”). The add itself
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
  | { kind: 'upload'; uploadId: string; fileName: string } // runtime resource, uploaded only with an order
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
- Uploads become local object URLs (no base64 in state; the file is sent only when ordering). An object URL
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
| File size  | ≤ 5 MB (5 MiB)                          | the API upload limit (`UPLOAD_MAX_BYTES`); read fully in memory for validation  |
| Dimensions | ≤ 4096 px per side and ≤ 4096 × 4096 px | a decoded 4096² image is ~64 MB RGBA; iOS Safari limits canvas area to ~16.7 MP |

Dimensions are read from the file header before decoding, and checked again after decoding.

### Image limitations

- Product images are transparent cut-outs, composited on the background in the set view and the
  export. The layout arranges each item's **visible box** (bounding box of its non-transparent
  pixels, alpha > 24, measured once per image by `visibleBounds.ts` on a ≤ 256 px scan), so margins
  around a garment do not become gaps. Zones and designs stay relative to the whole image; the scene
  draws the whole image so that its visible box lands on the placement. Without a readable canvas the
  whole image is used.

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
interface SetLayout { size: { width; height }; placements: Placement[]; strategy: 'rows' | 'grid' | 'template' }
interface LayoutItem { instanceId; aspectRatio; displayScale; priority }
layoutSet(items, size, { paddingRatio, gapRatio, maxItemFill }): SetLayout   // pure, deterministic

const composition = useComposition(selection, designs)   // DesignerPage; provideComposition / injectComposition
composition.mode            // 'item' | 'set'
composition.layout          // computed SetLayout (derived, never stored)
composition.template        // admin-arranged SetTemplate in use, or null (automatic layout)
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

### Admin-arranged templates ("Mẫu sắp xếp")

`catalog.layouts` (API `public/designer/config` → `layouts[]`) holds layouts the admin arranged for
one background: one rectangle (fractions of the background) per item and category. A slot takes an
item of its category or of any descendant. `assignSlots` (`templateLayout.ts`) gives every item its
own slot: the deepest slots choose first (then slot order), each taking the first unplaced item of
its branch in selection order. `matchTemplate` picks, among the templates of the **shown**
background that assign the whole set, the most specific one (largest sum of slot levels), then the
first in template order; `layoutFromTemplate` places the items by the same assignment and fits each
item inside its rectangle without distortion (`displayScale` is not used). With leaf-only slots
this is "same categories and counts, filled in selection order". No match → the automatic layout
below. The admin edits templates at `/thiet-ke/mau-sap-xep`.

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
  not physical measurements (values are set per color through the admin API; no centimetres exist).
- Order: `COMPOSITION.categoryPriority` keyed by **category slug** (ids differ per database; empty
  until the real slugs are known, so every category has priority 0), then larger visual size, then
  add order.
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

The set view and the export work with images from the API. Visual acceptance still needs approved
backgrounds and preset images (transparent where they sit on a garment), verified display scales,
embroidery zones and thread colors entered through the admin API.

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

- Product images are transparent cut-outs composited on the chosen background. Functional
  acceptance is done; **visual acceptance is not** (see above).
- The background is drawn with default image smoothing; very large uploaded images drawn small
  may look slightly aliased.
- A canvas that the browser marks tainted cannot be exported. API images are loaded with
  `crossOrigin = "anonymous"`, so the API must send CORS headers for the client origin (it does for
  origins in `CORS_ORIGINS`). There is no proxy or server fallback by design.
- Reloading the page loses the whole set and its designs.

## Site shell and routes (home page, phase H1)

Code: [router.ts](apps/client/src/router.ts), [features/site](apps/client/src/features/site),
[pages](apps/client/src/pages). Plan and later phases: [docs/homepage-plan.md](docs/homepage-plan.md).

- Routing uses `vue-router` (history mode, `base` from Vite's `BASE_URL`, set by `BASE_PATH`; see
  [Deployment](#deployment)). In development the app is served at `http://localhost:5173/`.
- Routes: `/` home, `/thiet-ke` the design tool (loaded on demand, no site footer; designs the
  cart, `?bo-suu-tap=<slug>` designs one collection, `?buoc=dat-hang` opens the checkout),
  `/san-pham`, `/san-pham/:slug` (“Thêm vào giỏ hàng”), `/bo-suu-tap`, `/bo-suu-tap/:slug`
  (“Thiết kế bộ sưu tập này”; see [Catalog pages](#catalog-pages-i3)), `/gio-hang` the cart,
  `/don-hang/:id` (see [Ordering](#ordering-i4)), `/tra-cuu-don-hang` the order lookup (phone
  number → orders with a masked code, date, status and item count; the full order code opens a
  `Modal` with items, amounts and status history), and one shared “coming soon” page for menu targets that are not built
  (`/lien-he`, `/ve-chung-toi`); unknown paths show a not-found page. Route `meta.title` sets the
  document title (`<page> – <default title>`).
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

- **Banner** (`HomeHero.vue` loads `GET public/banners`, `HomeBanner.vue` renders them) uses Swiper
  (`swiper/vue`, only the `A11y` and `Keyboard` modules plus the base CSS). Each active banner is a
  text card (title, optional description, “Xem chi tiết” when it has a `linkUrl`) over its image:
  the desktop image from 640 px, the mobile one below. An internal `linkUrl` (`/…`, use client
  paths such as `/bo-suu-tap/giang-sinh`) navigates in the app; an https one opens a new tab.
  While loading, a block of the banner's height is reserved; with no active banner (or a failed
  request) a short fixed introduction with “Bắt đầu thiết kế” is shown. With one banner there are
  no arrows, dots or auto-advance. Auto-advance
  (6 s) uses our own timer: off when the visitor prefers reduced motion, held while the banner is
  hovered or contains focus, restarted after every slide change, and always stoppable with the
  visible pause button. Arrows (from 640 px), dots, swipe and the arrow keys also navigate. Slides
  that are not shown are `inert`, so their buttons are not reachable with Tab.
- **Commitments** are 4 fixed items written in code (not backend data), without delivery or
  shipping claims; the wording is to be confirmed.
- **Images** of the fixed sections (process steps) are found by file name without extension in
  `apps/client/src/assets/home/` (png/jpg/jpeg/webp/avif). A missing file shows a placeholder.
  A file directly in `assets/home/` overrides one of the same name in `assets/home/_reference/`.
- **Reference images:** `assets/home/_reference/` is **git-ignored** and holds third-party images
  used only for local mockups. They are never committed, so CI and the GitHub Pages deploy build
  with placeholders. Before the site goes public, put your own (or licensed) images in
  `assets/home/` or serve them from the backend.

### Featured products and seasonal collections (phase H3)

Code: `features/home/components/FeaturedProducts.vue`, `SeasonalCollections.vue`,
`SectionHeading.vue`; data in `features/home/data/homeData.ts`.

- **Featured products** are the first 6 public products from `GET public/products` in the admin's
  order (the API has no featured flag for products), shown with the shared `ProductCard` and a
  “Xem tất cả sản phẩm” link. Loading text, an error with “Thử lại”, and the section is hidden when
  there are no products. 2 columns on phones, 3 from 768 px.
- **Seasonal collections** are the featured active collections (`GET public/collections?featured=true`,
  all pages) as `CollectionCard`s, plus “Xem tất cả bộ sưu tập”. A collection without an image shows
  a placeholder with a gift icon; the name sits on a light strip so it stays readable over any
  image. Hidden when there is none. 2 columns on phones, 3 from 768 px, 6 from 1024 px.
- Section titles are `h2` with `aria-labelledby` on the section.

## Catalog pages (I3)

Code: [features/catalog](apps/client/src/features/catalog) (`ProductCard`, `CollectionCard`,
`ProductList`, `formatPrice`) and the pages `ProductsPage`, `ProductDetailPage`, `CollectionsPage`,
`CollectionPage`. Lists that grow use `usePagedList` (“Xem thêm” loads the next page of 24; a
failed page keeps the shown items and offers “Thử lại”).

- `/san-pham` (all products) and `/danh-muc/<category path>` (e.g. `/danh-muc/ao/ao-thun`: the
  category and its descendants, API `categoryPath`): one row of filter buttons per level (the roots,
  then the children of the chosen category), plus name search in `?q=`, so a filtered list can be
  shared or reloaded. Old links `/san-pham?danh-muc=<slug>` redirect to `/danh-muc/<slug>`.
- `/san-pham/:slug`: display photo of the chosen color, the category trail (each level links to its
  list), name, price, description, color
  choice (swatch from `hexCode` when set), the available sizes (chosen when ordering, I4) and
  “Thêm vào giỏ hàng” (the color goes to the cart; designing starts from the cart). Unknown or hidden
  products show
  “Không tìm thấy sản phẩm”.
- `/bo-suu-tap`: every active collection. `/bo-suu-tap/:slug`: name, description and its public
  products; unknown or inactive collections show “Không tìm thấy bộ sưu tập”.
- Prices are whole VND from the API, formatted with `Intl.NumberFormat('vi-VN')` (“199.000 ₫”).
- Every page distinguishes loading, error with retry, empty and not found (`notFound` of
  `useRemoteData`/`usePagedList` is true for an API 404).

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

## Ordering (I4)

Code: [features/checkout](apps/client/src/features/checkout) and
[pages/OrderPage.vue](apps/client/src/pages/OrderPage.vue); API calls in
[api/orders.ts](apps/client/src/api/orders.ts). Ordering is a **contact request**: no payment; the
shop quotes the embroidery fee and confirms by phone.

- **Cart** ([features/cart](apps/client/src/features/cart)): product colors kept in localStorage
  (ids only; names, images and prices from the API), shared by the tabs, at most `maxOrderItems`.
  The cart page offers “Thiết kế” (the design tool on the cart) and “Đặt hàng không thiết kế” (the
  same checkout, opened directly). In cart mode the design tool starts from the cart items (same
  ids) and writes every add/remove back; ordered items leave the cart. A collection design is its
  own set: it is ordered from the design tool or added to the cart with “Thêm vào giỏ”. Designs
  are kept in the page only (reloading or leaving loses them; drafts are not used yet).
- “Đặt hàng” in the design tool header (step 4) replaces the design area with the checkout; the set
  and its designs stay in the page state, “Quay lại thiết kế” returns to them unchanged.
- Checkout: the items (with “Có thêu/Không thêu” and the price from `public/products/:slug`), a
  size `Select` per item whose product has sizes (required), name, phone, address and an optional
  note, and a summary: subtotal, embroidery fee “Báo giá sau”. Fields are checked with the API's
  rules ([customer.ts](apps/client/src/features/checkout/customer.ts): phone normalised to
  `0…`, mobile or landline); API field errors are mapped back to the fields in Vietnamese.
- Sending ([submitOrder.ts](apps/client/src/features/checkout/submitOrder.ts)), with the set locked
  like the image download: guest session (reused from `sessionStorage` while it has 10 minutes
  left, else created) → upload each customer image once (`customer_image`) → a JPEG preview of the
  set (`ORDER_PREVIEW`: 1600 px, quality 0.88; skipped if it cannot be made) as `design_preview` →
  `POST public/orders` with `source.type = "design"` and an `Idempotency-Key`.
  [orderPayload.ts](apps/client/src/features/checkout/orderPayload.ts) maps the designer state:
  `instanceId` → `clientItemId`, zone id → `zoneKey`, upload → server `fileId`, preset → `presetId`.
- Retries: the same request reuses the uploaded files and the same key, so “gửi lại” after a lost
  response returns the existing order instead of a second one; a changed request gets a new key.
  A rejected session (401) creates a new one and uploads again; uploads that expired (422) are
  uploaded again — each once per attempt.
- `/don-hang/:id`: order code, status, items (color, size, embroidery summary, price), subtotal,
  embroidery fee “Chờ báo giá” and total “Sau khi báo phí thêu” while not quoted (`null` is never
  shown as a final amount), contact details and the private preview (read with the token, shown as
  an object URL revoked on leave). Only the tab's guest session can read it (24 hours); without it
  the page confirms the order code saved by this tab, or explains that the order cannot be shown.
- Customer images are now limited to 5 MB to match the API.

## Admin app (I5)

`yarn dev:admin` → <http://localhost:5174> (or `yarn dev:all` with the client; the API must list
`http://localhost:5174` in `CORS_ORIGINS`). Base URL: `VITE_API_BASE_URL` as for the client
([apps/admin/.env.example](apps/admin/.env.example)). `yarn build:admin` builds `apps/admin/dist`;
the GitHub Pages workflow builds the client only. On Cloudflare the admin is its own Pages project
on a separate subdomain (see [Deployment](#deployment)).

- **UI:** `@lituta/ui` first (Button, Select, FormField, Image, Typography, Link, Row/Col, Flex,
  EmptyState); Ant Design Vue 4.2 for what it lacks: Table, Modal, Drawer, Menu, Input/InputNumber/
  Textarea/Switch/Checkbox, RangePicker, Timeline, Tag, Spin and messages. The Ant theme
  ([theme.ts](apps/admin/src/theme.ts)) is read from the shared tokens at runtime; locale `vi_VN`.
- **HTTP client** ([httpClient.ts](apps/admin/src/api/httpClient.ts)): `get`, `post`, `put`,
  `patch`, `delete`, `upload` (multipart, one file part `file` plus optional text fields), `blob`
  (private images) and `getAll` (every page). Unwraps `{ code, data }`, turns failures into
  `ApiError` (`kind`, `status`, `code`, `requestId`, field `errors`); `fieldErrors()` and the
  Vietnamese `errorMessage()` feed forms and toasts. Authenticated calls send the access token and,
  on a 401, refresh once and repeat the request once; `anonymous` calls (login/refresh/logout)
  never do. Endpoints are grouped in [resources.ts](apps/admin/src/api/resources.ts), DTO shapes in
  [types.ts](apps/admin/src/api/types.ts).
- **Session** ([auth/session.ts](apps/admin/src/auth/session.ts)): access token in memory only;
  the rotating refresh token in `localStorage` (`lituta.admin.refreshToken`) so a reload or new tab
  stays signed in. Refreshes are single-flight; if another tab already rotated the token, its newer
  token is tried once; a rejected refresh signs out and the router returns to `/dang-nhap?redirect=…`
  (in-app paths only). A refresh that fails offline keeps the session. Logout revokes on the server
  (best effort) and always clears locally.
- **Pages:** orders (search by code/name/phone, status, date range; detail with items, embroidery
  text/colors, customer images and preview read with the token, quote with `expectedRevision`,
  allowed status changes, history; a 409 reloads the order), products (draft → colors with display
  and transparent design images → sizes → publish), color zones, categories, collections and
  members, banners (link rule checked as in the API), backgrounds, ready-made images, item limits
  and default background.
- **Pages vs modals:** records with many settings are edited on their own routes, never in a modal:
  `/san-pham/moi`, `/san-pham/:id` (information, colors, sizes, publishing),
  `/san-pham/:id/thiet-ke` (embroidery zones, designer flag, display scale),
  `/san-pham/:id/mau/moi` and `/san-pham/:id/mau/:colorId` (palette color, images, order, on sale),
  `/bo-suu-tap/moi` and `/bo-suu-tap/:id` (information and products). Leaving a page with unsaved
  changes asks first ([useLeaveGuard.ts](apps/admin/src/composables/useLeaveGuard.ts)). Short forms
  (categories, banners, backgrounds, ready-made images, order quote/status) stay in modals.
- **Ordering** is drag and drop ([useRowReorder.ts](apps/admin/src/composables/useRowReorder.ts)
  with SortableJS on the Ant table body, plus up/down buttons for the keyboard in
  [ReorderHandle.vue](apps/admin/src/components/ReorderHandle.vue)) for collections,
  collection members, banners, backgrounds, ready-made images and featured products
  (`/san-pham/noi-bat`, at most 24). The admin only sends the new neighbour
  (`PATCH .../position { afterId }`); the API computes `sortOrder`, so no form has an order field.
  New rows go last; the general product list is newest first. Ordering is off beyond page 1 of a
  list (100 rows per page).
- **Categories** are a tree (at most 3 levels; only categories without children hold products;
  hiding one hides its branch). The page loads every category and shows the tree indented; order
  changes among siblings with the up/down buttons only (no drag: a flat drag position is ambiguous
  in a tree), and the parent changes in the edit form (`PATCH .../position { parentId, afterId }`,
  the branch moves along and goes last). Selects show the full trail (“Áo › Áo thun”); a product's
  category must have no children, while item limits, layout slots and the product filter accept
  any level ([categoryTree.ts](apps/admin/src/utils/categoryTree.ts)).
- **Colors** are picked from the API palette (`GET /admin/color-palette`; each key once per
  product, "Nhiều màu" for prints); the name and swatch come from the API, nothing is typed.
- **Zone editor** ([ProductDesigner.vue](apps/admin/src/features/designer/ProductDesigner.vue), on
  the product design page): one set of zones per product, shared by all its colors, drawn over a
  chosen color's design image in image fractions (top-left origin) — switch the preview color to
  check that every color's design image uses the same framing. Drag to move, drag the corner to
  resize, arrow keys (Shift = resize) or number inputs; each zone is saved on its own, the key
  cannot change after saving, max 10 per product, rules as in the API
  ([zoneGeometry.ts](apps/admin/src/features/designer/zoneGeometry.ts)). The designer flag and
  display scale are saved separately (the API requires a saved zone to turn it on).
- Uploads ([ImageUploadField.vue](apps/admin/src/components/ImageUploadField.vue)) go to
  `POST /admin/files/upload` as soon as a file is picked (JPEG/PNG/WebP ≤ 5 MB; design images
  PNG/WebP only); the form sends the file id. An upload that is not saved within 5 minutes expires.

## Not implemented yet

All API phases I1–I5 are done (see [docs/api-integration-plan.md](docs/api-integration-plan.md)).
Saving the set as a draft across reloads (the API supports it), an order lookup page, admin
deployment and admin account management in the UI (the API only has console commands) are not
built.

Not planned: exporting other formats or sizes, sharing/saving to the photo library, PDF, manual
moving/resizing of items in the set, saving a layout, applying a design to the whole set,
undo/redo, more than one text and one image per zone, multi-select and layer reordering, choosing
fonts, thread/fabric/lighting simulation, background removal, customer zone editing, customer
accounts, payment.
