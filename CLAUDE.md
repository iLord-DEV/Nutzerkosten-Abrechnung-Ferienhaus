# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **vacation home cost tracking and billing application** (Nutzerkosten-Abrechnung für Wohngemeinschaften) for managing shared housing costs. Built with Astro 5 (server-side rendering), Vue 3, Tailwind CSS 4, and MySQL/Prisma ORM.

**Key Features:**
- User management with role-based authentication (ADMIN/USER)
- Stay tracking (Aufenthalte) with oil meter readings and overnight counts
- Oil tank refill management (Tankfüllungen)
- Meter management (Zaehler) with installation/removal tracking
- Cost calculation and statistics
- Event planning (Terminplanung) with voting and comments
- Blog system with polls, image galleries, and modular content

## Development Commands

```bash
# Development
npm run dev                    # Start dev server (default: http://localhost:4321)
npm run build                  # Production build
npm run preview                # Preview production build
npm start                      # Start production server (HOST=0.0.0.0)

# Database
npx prisma migrate dev         # Create and apply migration
npx prisma migrate dev --name <name>  # Named migration
npx prisma db push             # Sync schema without migration
npx prisma generate            # Generate Prisma Client
npx prisma studio              # Open Prisma Studio GUI
npm run db:seed                # Seed database with test data

# Database Backup/Restore
npm run db:backup              # Local database backup
npm run db:backup:prod         # Production backup
npm run db:restore             # Shows restore command

# Deployment (Uberspace)
npx prisma migrate deploy      # Apply migrations in production
```

## Architecture

### Authentication & Authorization

- **Session-based auth** using secure cookies (`session` cookie with JSON data)
- **Password hashing** with bcrypt (see `src/utils/passwordValidation.ts`)
- **Auth utilities** in `src/utils/auth.ts`:
  - `getUser(context)`: Returns current user or null
  - `requireAuth(context)`: Throws if not authenticated
  - `requireAdmin(context)`: Throws if not admin
- **Protected layouts**:
  - `ProtectedLayout.astro`: Requires authentication, redirects to `/login`
  - `ProtectedBlogLayout.astro`: Blog-specific protected layout

### Database Architecture (Prisma)

**Core Models:**
- `User`: Authentication with role-based access (ADMIN/USER)
- `Aufenthalt`: Stay records with arrival/departure, meter readings, overnight counts
- `Zaehler`: Meter devices with installation/removal dates and activity status
- `Tankfuellung`: Oil refills linked to meters
- `Preise`: Yearly pricing (oil, overnight costs, consumption per hour)
- `JahresAbschluss`: Annual closing with total costs and consumption

**Event Planning:**
- `TerminPlanung`: Events with versioning
- `TerminAbstimmung`: Voting (APPROVE/NEED_INFO)
- `TerminKommentar`: Threaded comments with parent/child relationships
- `TerminAenderung`: Change history tracking

**Blog System:**
- `BlogPost`: Posts with status (DRAFT/PUBLISHED/ARCHIVED) and slug-based routing
- `BlogModule`: Modular content (SLIDER/IMAGE_GALLERY/POLL)
- `BlogImage`: Image uploads with metadata
- `Poll`: Polls with multiple-choice options and voting
- `BlogComment`: Threaded comment system

**Key Relationships:**
- Aufenthalt links to TWO Zaehler: one for arrival (`zaehlerId`), one for departure (`zaehlerAbreiseId`)
- Most models include versioning for change tracking
- Cascading deletes on blog content (comments/images deleted with posts)

### Project Structure

```
src/
├── layouts/
│   ├── Layout.astro                  # Base layout
│   ├── ProtectedLayout.astro         # Auth-required pages
│   └── ProtectedBlogLayout.astro     # Blog auth pages
├── pages/
│   ├── index.astro                   # Landing page
│   ├── login.astro                   # Login page
│   ├── dashboard.astro               # User dashboard
│   ├── api/                          # API routes (backend)
│   │   ├── auth/                     # Authentication endpoints
│   │   ├── aufenthalte/              # Stay management
│   │   ├── tankfuellungen/           # Refill management
│   │   ├── zaehler/                  # Meter management
│   │   ├── terminplanung/            # Event planning
│   │   ├── blog/                     # Blog API
│   │   ├── preise.ts                 # Price management
│   │   └── statistiken.ts            # Statistics
│   ├── admin/                        # Admin-only pages
│   ├── aufenthalte/                  # Stay pages
│   ├── tankfuellungen/               # Refill pages
│   ├── terminplanung/                # Event planning
│   ├── blog/                         # Blog pages
│   ├── statistiken/                  # Statistics
│   └── profil/                       # User profile
├── utils/
│   ├── auth.ts                       # Authentication helpers
│   ├── passwordValidation.ts        # Password validation
│   └── aufenthaltValidation.ts      # Stay validation
└── styles/                           # Global styles

prisma/
├── schema.prisma                     # Database schema
├── migrations/                       # Migration history
└── seed.ts                          # Seed data script

scripts/
├── backup-database.sh               # Local backup script
└── backup-production.sh             # Production backup script
```

### API Routes Pattern

All API routes follow REST conventions:
- **GET** `/api/resource` - List/read
- **POST** `/api/resource` - Create
- **PUT/PATCH** `/api/resource/[id]` - Update
- **DELETE** `/api/resource/[id]` - Delete

API routes use:
- `requireAuth()` for authenticated endpoints
- `requireAdmin()` for admin-only endpoints
- JSON request/response bodies

### Frontend Patterns

- **Astro pages** for server-rendered UI with islands architecture
- **Vue 3 components** for interactive elements (charts, forms)
- **Tailwind CSS 4** via Vite plugin (no separate config file needed)
- **Chart.js + vue-chartjs** for data visualization

## Environment Setup

Copy `.env-example` to `.env` and configure:

```env
DATABASE_URL="mysql://user:password@localhost:3306/nutzerkosten_db"
```

**For Uberspace deployment:**
- Database name must have username prefix: `username_nutzerkosten`
- Server runs on `HOST=0.0.0.0` (required for external access)
- Use `screen` for process management
- Set web backend: `uberspace web backend set / --http --port 4321`

## Important Notes

1. **Tailwind CSS 4**: Requires `--legacy-peer-deps` flag during installation due to peer dependency conflicts
2. **Server Mode**: App uses `output: 'server'` with Node.js adapter in standalone mode for SSR
3. **Database Migrations**: Always use `npx prisma migrate deploy` in production (not `migrate dev`)
4. **Password Security**: Passwords must be 8+ characters with uppercase, lowercase, numbers, and special characters
5. **Meter Tracking**: Each stay (Aufenthalt) references two meters - one for arrival and one for departure readings
6. **German Language**: Application is in German - all user-facing text, comments, and variable names
