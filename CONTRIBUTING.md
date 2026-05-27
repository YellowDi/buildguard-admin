# Contributing to BuildGuard Admin

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env.local` and configure
4. Start dev server: `pnpm dev`

## Branching

- `main` — production-ready code
- Feature branches: `feat/<description>`
- Bug fixes: `fix/<description>`
- Keep branches short-lived and focused

## Commit Messages

Use concise, descriptive commit messages. No strict format required, but prefer:

```
<type>: <short summary>

<body (optional)>
```

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`

## Code Guidelines

- **TypeScript strict mode** — no `any` without justification
- **Composition API** — use `<script setup>` with composables, not Options API
- **Design tokens** — use CSS custom properties from `global.css`, not hardcoded colors
- **UI components** — prefer shadcn-vue primitives in `src/components/ui/` over custom implementations
- **API calls** — use the centralized `src/lib/api.ts` helpers (`buildApiUrl`, `buildApiHeaders`)
- **Permissions** — use `PermissionGate` component or `useCurrentUserPermissions` composable

## Verification

No test framework is configured. Before submitting:

1. Run `vue-tsc -b` — must pass with no errors
2. Review your changes manually for correctness
3. Ensure no regressions in related features

## Pull Requests

1. Keep PRs focused — one feature or fix per PR
2. Describe what changed and why
3. Reference related issues if applicable
4. Ensure the branch is up to date with `main`
