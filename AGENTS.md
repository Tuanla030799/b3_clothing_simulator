# Repository instructions

## Scope and working agreement

- Implement only the active phase and explicitly requested changes.
- Read the current task, existing instructions, package manifests, and relevant code before editing.
- Preserve unrelated user changes. Do not reset, overwrite, or stage them.
- Resolve routine implementation details independently. Ask only when an unresolved decision materially affects behavior, data, or public APIs.
- Do not invent business rules or silently change agreed component APIs.
- Keep this file focused on durable rules. Keep phase specifications in project documentation.
- Planned paths and component names below are targets, not evidence that they already exist.

## Stack and workspace boundaries

- Use Vue 3 Composition API with `<script setup lang="ts">`, TypeScript strict, Vite, Tailwind CSS, and shadcn-vue.
- Use Yarn workspaces with one root yarn.lock and the packageManager version pinned in package.json. Do not introduce another package manager or lockfile.
- Declare dependencies in the workspace that uses them; avoid duplicate Vue runtimes.
- Keep client (`apps/client`) and admin (`apps/admin`) as separate applications in the same repository; each has its own API client.
- The backend lives in the separate `b3_clothing_simulator_api` repository; never add a backend here.
- Integrate the API phase by phase as described in `docs/api-integration-plan.md`.
- Applications import shared UI through `@lituta/ui` public exports, not cross-package relative paths.
- Shared UI must not import application components, catalog data, API clients, routers, or stores.
- Add packages, state libraries, routers, services, and abstractions only for a concrete current need.
- Use Ant Design Vue only in the admin app and only for what `@lituta/ui` does not provide (Table, Modal, Drawer, Menu, inputs, date pickers, messages). Use the shared Button, Select, FormField, Image, Typography, Link, layout and EmptyState first. Do not create shared wrappers around Ant components.

## Repository structure

| Path                               | Responsibility                                     |
| ---------------------------------- | -------------------------------------------------- |
| apps/client/src/pages              | Screen entry points and page composition           |
| apps/client/src/api                | HTTP client, API DTO types, remote-data composable |
| apps/client/src/features/<feature> | Feature components, logic, types, local data       |
| apps/client/src/assets             | Static site images and design fonts (not catalog)  |
| apps/client/src/dev                | Development-only UI playground                     |
| packages/ui/src/components/ui      | Underlying shadcn-vue primitives                   |
| packages/ui/src/components/common  | Project-level shared components                    |
| packages/ui/src/styles             | Shared tokens, base styles, UI font declarations   |
| packages/ui/src/lib                | Small UI utilities                                 |
| packages/ui/src/index.ts           | Public exports                                     |

Keep business-specific UI in its feature. Create directories only when they contain actual work.

## UI implementation

- Before UI work, inspect `packages/ui/src/index.ts`, then read only relevant implementations, types, and the component guide in README.
- Verify props, slots, defaults, and events. Never guess APIs from another library.
- Use Container, Flex, Row, and Col for layout patterns covered by their APIs. Row/Col use 24 columns; do not introduce Grid/GridItem alongside them.
- Use Button for actions, Image for UI images, and Typography for standard text styles.
- Use FormField, Select, Dropdown, and EmptyState for their intended purposes.
- Select chooses a form value; Dropdown opens an action menu.
- Names are `Image` and `FormField`, not AppImage/AppFormField.
- Do not recreate shared components using raw HTML with repeated Tailwind classes.
- Native semantic structure such as main, section, nav, ul, li, and form remains appropriate.
- This reuse rule applies to consumers; implementing shared primitives naturally requires native elements.
- Canvas rendering is separate from the DOM Image component. Use `window.Image` when needed to avoid import-name collisions.
- Keep one public API per shared component; do not add forwarding-only wrappers.

## Styling and typography

- Prefer existing component props and variants over overriding component styles.
- Use semantic tokens; do not hardcode colors or repeat basic control styles in page components.
- Use Tailwind for feature-specific layout and styles not covered by common APIs.
- Do not override common internals with deep selectors or !important.
- Add the smallest justified shared variant when a recurring requirement is not supported; inspect callers first.
- Ensure Tailwind scans app and shared UI sources. Avoid interpolated class names that the scanner cannot discover.
- Keep Row/Col breakpoints aligned with Tailwind and defined consistently.
- Use Be Vietnam Pro for shared UI; keep Dancing Script for product lettering in the client.
- Preserve font licenses and verify Vietnamese glyphs in the actual font assets.
- Preserve labels, keyboard navigation, focus visibility, and accessible names.

## Shared component changes

- Inspect callers before changing props, slots, defaults, events, exports, or rendered semantics.
- Preserve behavior unless the task explicitly changes it.
- Forward native attributes and events intentionally to the correct element.
- Update the component guide and development playground when public APIs change.
- Read `.claude/skills/shared-ui-component/SKILL.md` when adding or changing shared UI behavior or APIs. Routine component consumption does not require the full workflow.
- If a referenced implementation or guide does not exist yet, use the current phase specification. Do not assume it exists or create unrelated scaffolding.

## Product invariants

- The API is the source of truth for catalog, designer configuration, banners, collections and orders. Do not keep mock copies of API data in the client; show loading and error states with a retry instead.
- The API contract (envelope, error codes, DTOs) is documented in the API repository (README and `docs/*-contract.md`). Read it before integrating an endpoint; do not guess fields.
- Selection limits come from the designer config (`maxItems`, per-category limits keyed by category ID). Check category IDs, not translated names; never hardcode the 10/3 defaults.
- Repeated products are allowed. Each selected instance has independent identity and design.
- A designer product is one API product color. Its image is the color's transparent design image; embroidery zones are rectangles normalized to that image, not the viewport.
- Keep product design coordinates independent of composition placement.
- Do not invent real image dimensions or physical proportions; use the sizes the API reports and the decoded size when they differ.
- Missing images must have stable fallbacks, not broken requests or fake exportable products.
- Canvas images from the API are loaded with CORS so export keeps working; never draw images that would taint the canvas.
- Prices are calculated by the API; the client only displays them. Ordering is a contact request (no payment); an unquoted embroidery fee is not a final total.
- Do not introduce customer accounts, payment or realistic thread simulation without a requested scope change.

## Verification and documentation

- Inspect actual package scripts before running commands; do not invent successful checks.
- Run relevant typecheck, lint, and production build checks for affected workspaces.
- For shared UI changes, check consuming apps as needed to resolve compatibility risk.
- Verify responsive behavior and keyboard interaction when browser tools are available; disclose when not verified.
- Add focused tests for meaningful behavior, not tests that mirror static configuration or implementation details.
- Ensure development playground code is excluded from production.
- Report changes, checks performed, failures, and remaining limitations.
- Update README/component documentation for changed APIs, setup, or asset conventions.

## Commits

- Commit only when explicitly requested by the user.
- Allowed commit types: add, fix, update, remove, refactor, agent, feat, chore, docs.
- Use the format: `<type>: <description>`.
- Do not include a scope such as `feat(ui):`.
- Write concise, specific descriptions of the actual change.
- Do not use vague messages such as `update`, `fix stuff`, `changes`, or `WIP`.
- Do not mention AI, Codex, Claude, ChatGPT, Antigravity, or automated generation in commit messages.
- Do not add `Co-authored-by` or similar AI attribution unless explicitly requested.
- Keep each commit focused on one logical change.
- Inspect the staged diff before committing; do not stage unrelated changes or secrets.
- Run relevant checks before committing and report failures or unavailable checks.
- Do not amend, force-push, or rewrite history unless explicitly requested.

## Tool usage

- Use Context7 when library APIs or version-specific configuration
  are uncertain. Check installed versions first.
- Read local source for @lituta/ui APIs; do not infer them from
  external libraries.
- Use Playwright, when available, to verify UI changes against
  the local development server.
- Check relevant responsive states, keyboard interactions,
  console errors, and failed asset requests.
- For canvas behavior, combine screenshots and interaction checks;
  DOM inspection alone is insufficient.
- If a tool is unavailable, use an appropriate fallback and state
  which verification could not be completed.
