# BuildGuard Admin

Construction inspection management platform — manage customers, parks, buildings, inspections, and work orders.

## Tech Stack

- **Vue 3** + Composition API (`<script setup>`)
- **TypeScript** (strict mode)
- **Vite 6**
- **Tailwind CSS v4** with Notion-inspired design tokens
- **shadcn-vue** (Reka UI) for UI primitives

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) 10+

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy env template and configure
cp .env.example .env.local

# Start dev server
pnpm dev
```

Dev server runs at `http://localhost:5173/admin/` and proxies `/bqi` requests to the backend.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Type-check + production build |
| `pnpm preview` | Preview production build locally |
| `vue-tsc -b` | Type-check only |

## Environment Variables

See [`.env.example`](.env.example) for all available options. Key variables:

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | API base URL (empty = same origin) |
| `VITE_USE_MOCK_DATA` | Enable mock data mode |
| `VITE_AMAP_KEY` | Gaode Maps API key |

## Project Structure

```
src/
├── components/    # Reusable components (ui/, layout/, detail/, form/, table-page/)
├── composables/   # Vue composables (state, permissions, theme)
├── lib/           # API layer, auth, business logic, integrations
├── layouts/       # App shell and detail layouts
├── views/         # Page-level views (auth, dashboard, list, detail, form, settings)
├── router/        # Vue Router config with permission guards
└── styles/        # Global CSS with design tokens
```

## License

Proprietary — see [LICENSE](LICENSE) for details.
