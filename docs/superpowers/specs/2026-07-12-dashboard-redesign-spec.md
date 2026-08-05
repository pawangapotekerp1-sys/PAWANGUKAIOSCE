# Dashboard Redesign & Design System Integration

## 1. Goal
Overhaul the `DashboardPage` (`src/pages/app/dashboard-page.tsx`) by replacing the legacy layout, cards, and styling with a modern, airy SaaS layout (Option A: Minimalist White). This includes repositioning elements for better hierarchy and rewriting the UX copy for a friendlier, more professional tone. Furthermore, establish a consistent Design System across the app by officially integrating `shadcn/ui` components and defining global CSS variables that map to our Clinical Elegance theme.

## 2. Scope & Constraints
- **Target File:** `src/pages/app/dashboard-page.tsx`.
- **Styling:** Map Shadcn's standard CSS variables (e.g., `--background`, `--card`, `--primary`) to the existing `clinical-*` tokens in `src/index.css` to ensure full compatibility with `shadcn/ui` components without losing our premium clinical theme.
- **Components:** Replace bespoke UI wrappers (`SurfacePanel`, `StatePanel`) on the Dashboard with standard `shadcn/ui` primitives (`Card`, `Badge`, `Alert`, etc.) for consistency.
- **Copywriting:** Update all static text in the Dashboard using the `ux-copy` guidelines (professional, motivating, clear).

## 3. Architecture & Data Flow
- The Dashboard will continue to consume `dashboardQuery` from `getDashboardSummary`. No API changes are required.
- The `ProductShell` wrapper remains intact; we are only redesigning the content injected inside it.

## 4. UI/UX Changes
### 4.1. Design System (Shadcn + Clinical Elegance)
We will update `src/index.css` to include the required Shadcn `:root` variables, mapped to our specific shades:
- `--background`: white (replaces the old cream body background).
- `--card`: white.
- `--primary`: mapped to `clinical-accent-primary`.
- `--muted`: mapped to a soft gray for subtle backgrounds.
- `--radius`: standardizing to `1rem` or `1.5rem` to match the floating layout's curves.

### 4.2. Hierarchy & Layout (Dashboard)
1. **Hero Section:** Greeting and high-level progress. Friendly copy: "Selamat datang kembali! Mari lanjutkan progres belajarmu hari ini."
2. **Priority Target (Next in Queue):** Move the "Target hari ini" (study queue) higher up so users know exactly what to do next.
3. **Weakest Links:** The "Blok terlemah" section, using Shadcn's Progress bar or custom minimalist visualization.
4. **Recent Sessions:** A clean list of recent tryouts using standard Shadcn Tables or list components.

### 4.3. Copywriting Upgrades
- *Old:* "Ringkasan belajar sedang dimuat" → *New:* "Menyiapkan ringkasan belajarmu..."
- *Old:* "Fokus dulu pada blok dengan skor terendah." → *New:* "Fokus tingkatkan pemahaman di materi ini untuk mendongkrak skormu."

## 5. Verification
- Verify `npm run build` succeeds.
- Verify `shadcn/ui` components render correctly with the injected CSS variables.
- Ensure the old legacy "cream" color (`#f2e8c9`) is completely purged from `index.css`.
