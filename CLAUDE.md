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
- Email notifications (new comments, new events, yearly summaries)

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
npm run db:restore             # Shows restore command

# Database Synchronization (Local ↔ Production)
npm run db:pull:prod           # Pull Production DB from Pi to local (OVERWRITES LOCAL!)
npm run db:push:prod           # Push local DB to Pi (DANGEROUS! OVERWRITES PROD!)

# Deployment (Uberspace)
npx prisma migrate deploy      # Apply migrations in production

# Docker Deployment (Raspberry Pi)
./deploy-to-pi.sh              # Deploy from Mac to Raspberry Pi (recommended!)
docker compose up -d           # Start all containers (on Pi)
docker compose down            # Stop all containers (on Pi)
docker compose logs -f         # View logs (on Pi)
docker compose ps              # Check status (on Pi)
docker compose build --no-cache # Rebuild images (on Pi)
docker compose exec app npx prisma studio  # Open Prisma Studio (on Pi)

# Docker Management (on Pi)
docker compose restart         # Restart containers
docker compose up -d --build   # Rebuild and start
docker exec wuestenstein-nutzerkosten-mysql mysqldump ... # Database backup
```

**Development Workflow:**
1. Develop locally: `npm run dev` (with HMR and local MySQL)
2. Deploy to Pi: `./deploy-to-pi.sh` (copies files via rsync, builds Docker, runs migrations)

**Database Workflow (Hybrid Approach):**
- **Production (Pi) = Single Source of Truth**
  - Real data should be entered directly on production (www.schloss-wuestenstein.de)
  - Production data is the authoritative version

- **Local Development:**
  - Weekly refresh: `npm run db:pull:prod` → Pulls fresh production data to local
  - Use for testing with real data
  - Local changes are typically discarded on next pull

- **Data Entry:**
  - **Preferred:** Enter data directly on production (www.schloss-wuestenstein.de)
  - **Alternative:** Enter locally, then `npm run db:push:prod` (with extreme caution!)

- **Code Deployment:**
  - `./deploy-to-pi.sh` → Deploys code + migrations (does NOT sync data)
  - Production data remains untouched
  - Only schema migrations are applied

**See [DOCKER.md](./DOCKER.md) for complete Docker deployment guide.**

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

### Email System

**Email utilities in `src/utils/email.ts`:**
- `sendEmail()`: Generic email sending (SMTP in production, console in development)
- `sendMagicLinkEmail()`: Authentication magic links
- `sendNewCommentEmail()`: Notification when someone comments on an event
- `sendNewTerminEmail()`: Notification when someone creates a new event
- `sendJahresabschlussEmail()`: Yearly cost summary email

**User Notification Preferences:**
- `User.notifyOnComments`: Receive emails for new comments
- `User.notifyOnTermine`: Receive emails for new events
- Configurable in user profile (`/profil`)

**Yearly Summary Email (Jahresabschluss):**
- Admin endpoint: `POST /api/admin/send-jahresabschluss`
- Preview: `GET /api/admin/send-jahresabschluss?jahr=2024`
- Cron script: `scripts/send-jahresabschluss.sh`
- Schedule: Run on February 1st at 9:00 AM (`0 9 1 2 *`)

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
│   ├── aufenthaltValidation.ts      # Stay validation
│   └── kostenberechnung.ts          # Oil cost calculation (meter-based)
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
- **DaisyUI Design System** for consistent component styling
- **Chart.js + vue-chartjs** for data visualization

### Standard CSS Classes

**IMPORTANT: Use these centralized classes for consistent styling across all pages!**

**Layout & Containers:**
- `content-wrapper` - Main content wrapper with responsive padding (max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8)
- `section-container` - Section wrapper with padding (px-4 sm:px-6 lg:px-8)
- `card-container` - Card/panel wrapper (bg-base-100 shadow rounded-lg p-6)

**Typography:**
- `page-title` - Main page heading (text-3xl font-bold text-base-content)
- `page-description` - Page subtitle/description (text-base-content with opacity)
- `page-header` - Header section wrapper (mb-8)

**Form Elements:**
- `input` - DaisyUI input field (use instead of manual Tailwind classes)
- `select` - DaisyUI select dropdown
- `checkbox` - DaisyUI checkbox
- `btn` - DaisyUI button (add variants like btn-primary, btn-secondary, etc.)

**Colors & Theme:**
- Use `text-base-content` instead of `text-gray-900 dark:text-white`
- Use `bg-base-100`, `bg-base-200`, `bg-base-300` for backgrounds
- Use `border-base-300` for borders
- DaisyUI handles dark mode automatically via theme switching

**Why this approach:**
- ✅ **Consistency**: Same look & feel across all pages
- ✅ **Maintainability**: Update styling in one place (global.css)
- ✅ **Dark Mode**: Automatic theme support via DaisyUI
- ✅ **Less code**: Reusable classes instead of repeated Tailwind utilities

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

**For Docker deployment (Raspberry Pi):**
- Copy `.env.docker.example` to `.env.docker` and set secure passwords
- App runs on port 3002 (configurable in docker compose.yml)
- MySQL data persists in Docker volume `mysql_data`
- ARM64 compatible (Raspberry Pi 3B+ or newer)
- See [DOCKER.md](./DOCKER.md) for detailed deployment guide

### Environment Files Overview

**IMPORTANT: Only these environment files should exist!**

| File | Status | Purpose | Contains |
|------|--------|---------|----------|
| `.env` | Local (gitignored) | Local development | `DATABASE_URL` for local MySQL |
| `.env-example` | Committed | Template for `.env` | Example values for local setup |
| `.env.docker` | Local (gitignored) | Docker credentials for Pi | `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, etc. |
| `.env.docker.example` | Committed | Template for `.env.docker` | Example values, gets copied to Pi |
| `.deploy-config` | Local (gitignored) | SSH config for deployment | `PI_USER`, `PI_HOST`, `PI_PORT`, etc. |
| `.deploy-config.example` | Committed | Template for `.deploy-config` | Example SSH configuration |

**What NOT to create:**
- ❌ `.env.production` - NOT NEEDED! Use `.env.docker` for Pi deployment
- ❌ `.env.local` - Use `.env` instead
- ❌ Any other `.env.*` files

**Credentials Flow:**
1. **Local dev**: Use `.env` with local MySQL
2. **Docker (Pi)**: Use `.env.docker` with Docker MySQL container
3. **Deployment**: `deploy-to-pi.sh` copies files to Pi (excluding `.env`, including `.env.docker.example`)

## Important Notes

1. **Tailwind CSS 4**: Requires `--legacy-peer-deps` flag during installation due to peer dependency conflicts
2. **Server Mode**: App uses `output: 'server'` with Node.js adapter in standalone mode for SSR
3. **Database Migrations**: Always use `npx prisma migrate deploy` in production (not `migrate dev`)
4. **Password Security**: Passwords must be 8+ characters with uppercase, lowercase, numbers, and special characters
5. **Meter Tracking**: Each stay (Aufenthalt) references two meters - one for arrival and one for departure readings
6. **German Language**: Application is in German - all user-facing text, comments, and variable names

## Business Logic & Calculations

### Data Storage Philosophy

**CRITICAL: The database stores ONLY raw facts, ALL calculations are done on-the-fly!**

**What is stored in database (Aufenthalt model):**
- ✅ Arrival/departure dates (`ankunft`, `abreise`)
- ✅ Meter readings (`zaehlerAnkunft`, `zaehlerAbreise`)
- ✅ Number of overnight stays (`uebernachtungenMitglieder`, `uebernachtungenGaeste`)
- ✅ Privileged status (`naechteBerechnen` - whether user is "begünstigt")
- ✅ User reference (`userId`)
- ✅ Year (`jahr`)

**What is NOT stored (calculated on-the-fly in JavaScript):**
- ❌ Total costs
- ❌ Oil costs
- ❌ Heating costs
- ❌ Overnight costs
- ❌ Savings from overlaps
- ❌ Overlap information
- ❌ Final costs after splitting

**Why this approach?**
- Prices can change (oil prices from Tankfüllungen, overnight prices from Preise)
- Overlaps can change when other users add/edit stays
- Calculations are always current and accurate
- No risk of stale/outdated cost data
- Single source of truth: the raw facts + calculation logic

**Exception:** `JahresAbschluss` model stores final calculations, but only as a snapshot at year-end for historical records.

**Implementation:** All cost calculations happen in the frontend (JavaScript in .astro files) by loading the necessary data (Aufenthalte, Tankfüllungen, Preise) and applying the calculation functions.

### Überlappungsberechnung (Overlap Detection)

**CRITICAL: Overlaps are calculated based on METER HOURS (Zählerstunden), NOT on date/time!**

This is a frequently misunderstood concept. Please read carefully:

**How it works:**
- Two stays overlap if they share meter hours, regardless of their actual dates
- Each stay has `zaehlerAnkunft` (arrival meter reading) and `zaehlerAbreise` (departure meter reading)
- Example:
  - Alexandra: 466h - 471h (arrives at meter 466, leaves at meter 471)
  - Christoph: 470h - 474h (arrives at meter 470, leaves at meter 474)
  - **They share hours 470-471 = 1 hour of overlap** ✓

**Detection Logic:**
```javascript
// Overlap exists when ranges intersect
const hatUeberlappung = a1Ende > a2Start && a1Start < a2Ende;

// Calculate overlap range
const overlapStart = Math.max(a1Start, a2Start);
const overlapEnd = Math.min(a1Ende, a2Ende);
const overlapHours = overlapEnd - overlapStart;

// Only count overlaps >= 1 hour
if (overlapHours >= 1) {
  // This is a valid overlap
}
```

**Important:**
- Use **strict inequalities** (`>` and `<`) for overlap detection
- If one person arrives at 470 and another leaves at 470, that's NOT an overlap (just a connection point)
- Only overlaps of 1 hour or more are counted and displayed
- Time validation (dates) happens during input, but cost calculations use meter readings only

### Ölkostenberechnung (Oil Cost Calculation)

**CRITICAL: Oil costs are calculated based on METER READINGS (Zählerstände), NOT on dates!**

**Core Principles:**
1. **Oil price per liter**: Valid FROM a specific meter reading (from Tankfüllung)
2. **Consumption (L/h)**: Calculated from 2nd refill onward: `Liter / (CurrentMeter - PreviousMeter)`
3. **NO RETROACTIVE CHANGES**: Values apply from their meter reading forward only - no one pays more or gets refunds when prices change

**Example:**
- Person arrives at meter 50, someone refuels at meter 60, person leaves at meter 65
- Hours 50-60: Use previous oil price (or fallback)
- Hours 60-65: Use new oil price from the refueling at meter 60

**Calculation Function:**
```javascript
function berechneOelkostenNachZaehlerstand(zaehlerStart, zaehlerEnde, tankfuellungen)
```

This function:
- Segments stays based on tankfüllungen within the meter range
- Each segment gets its own price and consumption rate
- Sums all segment costs: `hours × consumption(L/h) × price(€/L)`

**Fallback Values:**
- Oil price: **1.01 €/L** (before first refill)
- Consumption: **5.5 L/h** (before 2nd refill)
- Overnight costs: **5€ for members, 10€ for guests**

**Implementation:**
- **Utils**: `src/utils/kostenberechnung.ts` - Centralized calculation function with TypeScript types
- **Usage**: Imported in clientside `<script>` blocks of `index.astro` and `neu.astro`
- **How**: Astro supports ES module imports in `<script>` tags and bundles them automatically
- **Single source of truth**: Changes to calculation logic only need to be made in the utils file
- API endpoints filter invalid data (missing users, invalid meter readings)

### Validierungslogik (Validation Logic)

**CRITICAL: Meter reading validation only checks against user's OWN PREVIOUS stays!**

**Core Validation Rules:**
1. **End > Start** - Departure meter must be higher than arrival meter (for current stay)
2. **Start >= Previous End** - Arrival meter must be >= user's last departure meter reading

**Important Implementation Details:**

```javascript
// Validate only against user's own stays that ended BEFORE current arrival
const eigeneAufenthalte = await prisma.aufenthalt.findMany({
  where: {
    userId: data.userId,
    abreise: { lt: ankunftDate }  // Only stays ending BEFORE current arrival
  },
  orderBy: { abreise: 'desc' }  // Sort by DATE, not by meter reading!
});
```

**Why this approach:**
- ✅ **Overlaps allowed**: Different users can have different meter readings during the same time period
- ✅ **Meter resets allowed**: New meter installations (e.g., yearly) don't cause validation errors
- ✅ **Late entries allowed**: Users can add old stays without conflicts with newer entries
- ✅ **Time-based validation**: Only checks if meter readings make sense in chronological order for THAT user

**Example:**
- Person A: Jan 1 - Feb 1, Meter 50-100
- Person B: Jan 15 - Mar 1, Meter 60-150 (enters later)
- Person B's 60 < Person A's 100, but that's OK - different users can overlap with different readings

**Location:**
- Utils: `src/utils/aufenthaltValidation.ts` - Centralized validation logic
- API: Both POST (`/api/aufenthalte.ts`) and PUT (`/api/aufenthalte/[id].ts`) routes use these utils
- **Important**: Don't duplicate validation logic in API routes - always use `validateAufenthaltData()`

### naechteBerechnen Override System

**CRITICAL: The `naechteBerechnen` field overrides the user's default `beguenstigt` status!**

**Logic Hierarchy (from highest to lowest priority):**
1. **`naechteBerechnen === true`** → ALWAYS calculate overnight costs (even if user is "begünstigt")
2. **`naechteBerechnen === false`** → NEVER calculate overnight costs
3. **`naechteBerechnen === null`** → Use user's default: calculate if `!user.beguenstigt`

**Example:**
```javascript
let sollBerechnen;
if (naechteBerechnen === false) {
  sollBerechnen = false;  // Explicitly disabled
} else if (naechteBerechnen === true) {
  sollBerechnen = true;   // Explicitly enabled (overrides beguenstigt!)
} else {
  // null: fallback to user setting
  sollBerechnen = !user.beguenstigt;
}
```

**Use Cases:**
- User is "begünstigt" (normally no overnight charges) but had many guests → Set `naechteBerechnen = true`
- User is NOT "begünstigt" (normally charges) but special exception → Set `naechteBerechnen = false`
- Normal case → Leave `naechteBerechnen = null`, uses user's default status

**Database Storage:**
- Only store `true` if user is "begünstigt" AND explicitly enabled
- Otherwise store `null` (to save space and avoid confusion)
- `false` currently unused but reserved for future use

**Calculation:**
- Members: 5€ per night
- Guests: 10€ per night
- Only charged if `sollBerechnen === true` per logic above
