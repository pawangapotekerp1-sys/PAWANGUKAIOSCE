# Phase 2: App Shell & Student Dashboard Design Spec

## Overview
This document outlines the UI overhaul for Phase 2 of the "Clinical Elegance" design system integration for Pawang Apoteker. This phase focuses on the `ProductShell` (the main application layout) and the `DashboardPage` (the student dashboard landing area), transforming them from the legacy earthy/warm color palette to a pristine, medical-grade aesthetic.

## Architecture & Layout

### App Shell (`ProductShell`)
- **Background & Base Tone**: Remove the legacy linear gradients and dark teal backgrounds. Adopt a pure white (`bg-clinical-bg`) or extremely subtle off-white background.
- **Sidebar (Pristine & Floating)**: 
  - The sidebar will have a white background, blending continuously into the main layout.
  - It will be separated from the main content only by a subtle icy cyan border (`border-clinical-accent-primary/30`).
  - **Navigation Hover State**: Menu items will transition to a soft cyan background (`bg-clinical-accent-primary/10`) with `clinical-text-primary` (deep navy) text on hover. Active items will have slightly stronger accents.
  - **Typography**: The brand name in the sidebar will utilize `Space Grotesk` with heavy tracking.

### Student Dashboard (`DashboardPage`)
- **Card Design (Flat with Hover Lift)**: 
  - Modify `SurfacePanel` and other dashboard cards to use a solid white background with a faint icy border (`border border-clinical-accent-primary/20`).
  - Implement a micro-animation on interactive cards: `transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-clinical-accent-primary/20`.
- **Typography & Hierarchy**:
  - Main dashboard headings and key metric numbers will use `Space Grotesk`.
  - Body copy and descriptions will use `Inter`.
- **MetricPill & Accents**: 
  - Deprecate the "gold", "green", and "teal" legacy tones.
  - Use variations of cyan and blue (`clinical-accent-primary`, `clinical-accent-secondary`) to denote priorities or statuses.
- **Micro-Animations**: All hover states on buttons and cards will feature smooth 300ms transitions for a premium, responsive feel.

## Data Flow & Dependencies
- **Strict YAGNI**: No backend API calls (e.g., `getDashboardSummary`), state management (`useSession`), or routing logic will be modified. 
- Only presentation layer code (Tailwind v4 classes in `.tsx` files) will be changed.
- `src/components/layout/product-shell.tsx` and `src/pages/app/dashboard-page.tsx` are the primary targets, along with supportive UI components like `MetricPill`, `StatePanel`, and `SurfacePanel`.

## Scope
- Refactoring `product-shell.tsx`
- Refactoring `dashboard-page.tsx`
- Adapting sub-components (`MetricPill`, `StatePanel`, `SurfacePanel`, `SectionHeading`) to accept/utilize the new tokens.

## Edge Cases
- **Mobile Responsiveness**: The sidebar collapse logic and the dashboard grid breakpoints must remain intact and functionally identical to the legacy version.
