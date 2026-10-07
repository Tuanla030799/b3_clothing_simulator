# Lituta — Thiết kế bộ quà

Frontend tool for choosing newborn clothing/accessories, personalizing each item with a name or
logo, arranging the set on a background and downloading an image. V1 is frontend-only.

**Current state: Phase 1** — workspace, shared UI package, design tokens and fonts, the
responsive designer shell, local types/data and a development playground. See
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
- [data/catalog.ts](apps/client/src/features/designer/data/catalog.ts) — local development data
  (shirt, towel, hat, bib). **Provisional**: names, zones and display scales are placeholders and
  every entry has `provisional: true`. Not the final catalog; it will come from the backend later.
- Selection rules: `maxItems: 10`, `categoryLimits: { shirt: 3 }` — matched by **category id**,
  never by display name. No other category limits are defined.
- A `Product` is one model + one color (no variants). `productId` identifies the catalog
  product; a selected item will get its own `instanceId` and independent design in a later phase,
  so the same product can be added several times.

### Adding images

Put user-provided files (product images without embroidery, with transparent background) in:

| Folder                                | File name                                    |
| ------------------------------------- | -------------------------------------------- |
| `apps/client/src/assets/products/`    | `<product id>.<png\|webp\|jpg\|jpeg\|avif>`  |
| `apps/client/src/assets/backgrounds/` | `<background id>.<ext>` (default: `default`) |
| `apps/client/src/assets/designs/`     | `<preset id>.<ext>` (also `svg`)             |

Files are discovered with `import.meta.glob` in
[data/assets.ts](apps/client/src/features/designer/data/assets.ts), so production URLs are hashed
by Vite and a missing file simply means `src: undefined` → placeholder (no broken import or
request). Placeholders are never exportable product images.

When a real image is added, record its intrinsic `width`/`height` in the product `image` and
replace provisional zones/scale with measured values, then set `provisional: false`.

### Embroidery zones

`EmbroideryZone { id, name, x, y, width, height, allowedContent: ('text' | 'image')[] }`.
Coordinates are normalized 0–1 to the **full source image** (origin top-left), independent of
the viewport and of where the product is placed in the composition. A zone must stay inside the
image (`x + width ≤ 1`, `y + height ≤ 1`); `catalog.test.ts` checks these invariants.

## Not implemented yet

Adding items to the set, per-item personalization editor, canvas/drag and drop, undo/redo,
automatic arrangement, image export, multiple backgrounds selection, API or mock API, admin app,
Docker/CI/deploy. Out of V1 scope entirely: accounts, cart, payment, ordering, uploading logos to
a server, saving designs across reloads, realistic thread simulation.
