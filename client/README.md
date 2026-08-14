# Next.js Starter Template

A modern, type-safe, and production-ready Next.js starter template designed for high developer velocity and project portability. This starter is configured to work in three modes: frontend-only landing page, client for a custom backend API, or a full-stack Next.js application with a local database.

---

## 🚀 Key Features & Tech Stack

This starter is built with modern web technologies and pre-configured tools:

- **Core Framework**: [Next.js](https://nextjs.org) (App Router, React 19) with strict [TypeScript](https://www.typescriptlang.org) configuration.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) (integrated via PostCSS) for fast and responsive styling.
- **Database & ORM**: [Drizzle ORM](https://orm.drizzle.team/) configured with [PGlite](https://pglite.dev/) (an in-memory/local Postgres database running directly inside the Node process for painless local development) and standard PostgreSQL support.
- **Internationalization (i18n)**: Multi-language routing and translation management with [next-intl](https://next-intl-docs.vercel.app/).
- **Forms & Validation**: Form management with [React Hook Form](https://react-hook-form.com/) and schema validation with [Zod](https://zod.dev/).
- **Code Quality**: Blazing fast linter and formatter using [Oxlint](https://oxlint.dev/) and [Oxfmt](https://github.com/oxc-project/oxc) via the [Ultracite](https://github.com/ultra-cite) preset.
- **Testing Suite**: Unit testing using [Vitest](https://vitest.dev/) with native browser runner capabilities, and isolated UI component testing using [Storybook](https://storybook.js.org/).
- **Git Workflows**: [Lefthook](https://github.com/evilmartians/lefthook) for fast pre-commit hooks, [Commitlint](https://commitlint.js.org/) for conventional commits verification, and [Knip](https://github.com/webpro/knip) for unused file and dependency detection.

---

## 🏗️ Architectural Modes

To use this starter for different projects without overhead, you can choose from three main development paths:

### 1. Landing Page (Frontend Only, No Database)
For simple, fast static pages:
- Ignore or delete `src/models/`, `migrations/`, and `drizzle.config.ts`.
- You don't need to specify `DATABASE_URL` or run database migrations.

### 2. Frontend + Custom Backend
For client applications that consume an external API:
- All data-fetching is abstracted into the pre-configured [ApiClient.ts](file:///c:/Users/workm/Desktop/kaiya/kaiya/src/libs/ApiClient.ts) (`src/libs/ApiClient.ts`), which automatically forwards session tokens for authentication.
- Point to your backend by configuring the API URL in your environment variables.

### 3. Full Stack Application (Default)
For self-contained applications with their own database:
- Modify your database tables in [Schema.ts](file:///c:/Users/workm/Desktop/kaiya/kaiya/src/models/Schema.ts) (`src/models/Schema.ts`).
- Run `npm run db:generate` followed by `npm run db:migrate` to update your database.
- Uses local PGlite file-based storage (`local.db`) during development, with full PostgreSQL support in production.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+
- npm (or bun/yarn)

### Installation

1. Install dependencies:
   ```shell
   npm install
   ```

2. Start the local development server:
   ```shell
   npm run dev
   ```
   *Note: This starts a local file-backed PGlite Postgres server on port 5433 and launches the Next.js development environment on http://localhost:3000.*

---

## 📦 Project Structure

```shell
.
├── migrations/                     # Drizzle schema migrations
├── public/                         # Static assets (images, icons)
├── src/
│   ├── app/                        # Next.js App Router routes
│   ├── components/                 # Reusable React UI components
│   ├── libs/                       # Configuration for integrations (Auth, API Client, DB)
│   ├── locales/                    # Translation files (JSON) for i18n
│   ├── models/                     # Drizzle DB tables & schemas
│   ├── styles/                     # Global stylesheets & Tailwind setup
│   ├── templates/                  # Base structural templates & wrappers
│   ├── types/                      # Custom TypeScript definitions
│   ├── utils/                      # Helper utility functions
│   └── validations/                 # Client/Server validation schemas
├── tests/                          # Integration and End-to-End tests
├── checkly.config.ts               # API & E2E monitoring configuration (optional)
├── drizzle.config.ts               # Drizzle ORM schema configuration
├── oxlint.config.ts                # OxLint linter configuration
├── oxfmt.config.ts                 # OxFmt formatter configuration
├── next.config.ts                  # Next.js settings
├── package.json                    # Scripts and dependencies
├── tsconfig.json                   # TypeScript compiler options
└── vitest.config.ts                # Vitest test configurations
```

---

## 💻 Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| `npm run dev` | `run-p db-server:file dev:next` | Starts local PGlite DB server + Next.js in dev mode |
| `npm run build` | `run-s db:migrate build:next` | Applies migrations and compiles a production Next.js build |
| `npm run build-local` | `run-p db-server:memory build:next --race` | Builds the app locally using a temporary in-memory Postgres database |
| `npm run start` | `next start` | Starts the production server locally |
| `npm run lint` | `ultracite check` | Runs Oxlint to check for code quality issues |
| `npm run lint:fix` | `ultracite fix` | Runs linter and applies automatic code fixes |
| `npm run check:types` | `tsc --noEmit` | Runs TypeScript compilation check |
| `npm run check:i18n` | `i18n-check` | Verifies translation files have matching and valid keys |
| `npm run check:deps` | `knip` | Detects unused files, dependencies, and exports |
| `npm run test` | `vitest run` | Runs unit tests once |
| `npm run storybook` | `storybook dev` | Launches Storybook component dashboard |
| `npm run db:generate` | `drizzle-kit generate` | Generates a new SQL migration from schema updates |
| `npm run db:migrate` | `drizzle-kit migrate` | Applies pending migrations to the configured database |
| `npm run db:studio` | `drizzle-kit studio` | Opens the Drizzle database explorer dashboard |

---

## 🎨 Customization Checklist

When starting a new project with this template, look for `FIXME` and customize:
- [AppConfig.ts](file:///c:/Users/workm/Desktop/kaiya/kaiya/src/utils/AppConfig.ts) (`src/utils/AppConfig.ts`): Change the application name, locale preferences, and base paths.
- Favicons and Icons (`public/`): Replace the default touch-icons and favicon.ico files.
- [BaseTemplate.tsx](file:///c:/Users/workm/Desktop/kaiya/kaiya/src/templates/BaseTemplate.tsx) (`src/templates/BaseTemplate.tsx`): Customize the navbar branding, links, and footer info.
- Localization (`src/locales/`): Update language translations for marketing and dashboard pages.
