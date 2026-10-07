---
name: shared-ui-component
description: Create or modify shared Vue components in the Lituta UI package. Use when adding common components, changing their props, slots, events, defaults, accessibility, or shared variants. Do not use for ordinary component consumption or unrelated feature logic.
---

# Shared UI Component

## 1. Inspect before editing

- Read root AGENTS.md and applicable nested instructions.
- Read the current task or phase specification.
- Inspect packages/ui/src/index.ts and the relevant component guide.
- Read the affected component, its types, underlying primitives,
  and representative callers.
- Search for existing equivalent components before adding a new one.
- Treat planned components as requirements, not existing implementations.
- If the repository is not initialized, follow the active phase
  specification without scaffolding unrelated features.

## 2. Establish the smallest API

- List the required props, defaults, slots, events, and native semantics.
- Preserve existing public behavior unless the task changes it.
- Follow the agreed naming and prop conventions.
- Distinguish Select for values from Dropdown for actions.
- Keep FormField presentational; do not introduce form state or
  validation ownership without a requirement.
- Prefer an existing variant over creating a duplicate component.
- Keep feature-specific data and behavior outside the UI package.
- Ask only when an unresolved choice materially changes the contract.

## 3. Implement

- Use Vue Composition API and strict TypeScript.
- Reuse suitable shadcn-vue primitives for interaction and accessibility.
- Publish one public API per component through @lituta/ui.
- Use semantic tokens and shared size/spacing conventions.
- Forward attributes and events to the intended native element.
- Preserve keyboard navigation, focus, labels, and disabled behavior.
- Avoid forwarding-only wrappers, deep selectors, and !important.
- Keep responsive behavior in CSS where possible.
- Do not use dynamically interpolated Tailwind classes that the
  build cannot discover.

## 4. Verify relevant behavior

Select checks according to the component being changed:

- Row/Col: 24-column rows with gutters, responsive inheritance,
  offsets, zero spans, and no unintended overflow.
- Button: native type, disabled/loading interaction, accessible name,
  and stable content.
- Image: missing source, failed load, source changes, stale events,
  lazy loading, and fallback semantics.
- FormField: label association, unique description/error IDs,
  aria-describedby, and aria-invalid.
- Select: controlled value, number/string identity, clear behavior,
  disabled options, empty/loading states, and keyboard operation.
- Dropdown: trigger semantics, keyboard access, disabled items,
  selection, dismissal, and focus restoration.
- Typography: correct HTML element independently of visual variant.
- Layout changes: check representative mobile and desktop widths.

Add focused tests when needed for meaningful behavioral risk.
Do not test static declarations merely to mirror implementation.

## 5. Document and hand off

- Update public exports.
- Update the component guide with actual props, defaults, slots,
  events, and a minimal usage example.
- Update the development playground for changed states.
- Keep the playground outside the production bundle.
- Run applicable scripts from the actual package manifests.
- Check affected consumers when compatibility may have changed.
- Report the API change, checks performed, and remaining limitations.
- Do not claim browser verification unless it was performed.
- Follow AGENTS.md commit rules; this workflow does not authorize
  committing or publishing.
