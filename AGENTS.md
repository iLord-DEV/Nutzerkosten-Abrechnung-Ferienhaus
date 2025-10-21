# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds Astro pages, shared layouts, utilities, and global styles; use `src/pages/api` for server routes, `src/pages/admin` for admin dashboards, and `src/utils` for auth and helpers.
- `prisma/` stores `schema.prisma`, generated migrations, and the `seed.ts` bootstrapper; update schema changes here first.
- `public/` surfaces static assets (logos, favicons, uploads), while `dist/` is build output and must stay untracked.
- `scripts/` contains database backup helpers; adjust bash scripts here when deployment procedures change.

## Build, Test, and Development Commands
- `npm run dev` starts the Astro dev server with live reload.
- `npm run build` generates the production bundle into `dist/`; run before deploying.
- `npm run preview` serves the compiled build locally to sanity-check production behavior.
- `npm run start` starts the server entry for environments where the compiled bundle is deployed.
- `npm run db:seed` seeds local databases via `tsx prisma/seed.ts`; rerun after schema changes.
- `npm run db:backup` and `npm run db:backup:prod` trigger the shell scripts in `scripts/` for local or production snapshots.

## Coding Style & Naming Conventions
- Use 2-space indentation, single quotes in TypeScript, and PascalCase for exported types/functions (`UserSession`, `requireAuth`).
- Keep files grouped by domain inside `src/pages` (e.g., `aufenthalte`, `terminplaner`), and co-locate Vue components with their owning page.
- Favor TypeScript types over `any`; tsconfig extends Astro’s strict profile—resolve type errors before committing.
- Tailwind class lists should remain ordered by layout → spacing → typography to ease reviews; run `npm run build` to catch PurgeCSS regressions.

## Testing Guidelines
- No automated test harness exists yet; validate features manually in `npm run dev`, then confirm `npm run build` completes cleanly.
- After Prisma updates, execute `npx prisma migrate dev` followed by `npm run db:seed` to verify migrations and seed data.
- Record new QA scenarios in PR descriptions so others can repeat them.

## Commit & Pull Request Guidelines
- Follow the existing short, action-first subject style (`fixed: login redirect`, `new design start`); scope one change per commit.
- PRs must summarize intent, link related issues, and list validation steps; attach screenshots for UI or email changes.
- Call out database or environment impacts prominently and update `.env-example` when introducing new variables.

## Environment & Security Notes
- Create `.env` from `.env-example`; never commit secrets. Use local passwords only in `.env`, and rotate production credentials after running backup scripts.
- Backup artifacts live in `backups/`; ensure archives exclude sensitive `.env` files before sharing.
