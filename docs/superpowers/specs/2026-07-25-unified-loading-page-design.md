# Design Spec: Unified Modern Loading Page

## Overview
This specification details the design and implementation of a unified, modern, high-aesthetic loading page (`FullPageLoader`) for Pawang Apoteker, replacing the legacy cream-colored loading and error screens (`RouteLoadingState` & `GuardErrorState`).

## Goals
1. Eliminate all legacy cream background screens (`rgba(242,232,201,...)`).
2. Create a single, highly aesthetic, reusable component (`FullPageLoader`) in `src/components/ui/full-page-loader.tsx`.
3. Support both `loading` and `error` variants with consistent glassmorphism, Hygieia branding, and smooth micro-animations.
4. Integrate `FullPageLoader` into `app-router.tsx` (Route Suspense fallback) and `route-guards.tsx` (Access Verification & Error states).

## Visual Architecture & Tokens

### Background & Atmosphere
- Base background: `bg-clinical-surface`
- Ambient Glow: Two floating radial mesh blur elements in top-left and bottom-right corners (`bg-primary/10 blur-3xl pointer-events-none`).

### Centered Glass Card
- Container: `max-w-md w-full rounded-3xl border border-border/50 bg-card/80 p-8 shadow-2xl shadow-primary/5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center text-center`.

### Branding Icon & Animations
- Logo Container: `relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner mb-5`.
- Pulsing Wave: Ambient ring behind the logo container with `animate-ping` or `animate-pulse` scaling.
- Icon: Precision SVG silhouette of the **Bowl of Hygieia** (Cawan & Ular Farmasi).

### Progress Indicator
- Indeterminate Shimmering Gradient Bar: A sleek 1.5px / 2px bar with an animated gradient pulse across the container width.

### Typography
- Title: `text-lg font-extrabold tracking-tight text-foreground` (e.g. "Menyiapkan Ruang Belajar...")
- Description: `mt-2 text-xs text-muted-foreground leading-relaxed`

## Component API (`FullPageLoader`)

```tsx
export type FullPageLoaderProps = {
  title?: string;
  description?: string;
  variant?: "loading" | "error";
  errorDetails?: string;
};
```

## Integration Plan

1. **New Component**: `src/components/ui/full-page-loader.tsx`
   - Exports `FullPageLoader`.
2. **App Router**: `src/router/app-router.tsx`
   - Replace `RouteLoadingState` implementation with `<FullPageLoader />`.
3. **Route Guards**: `src/router/route-guards.tsx`
   - Replace `GuardErrorState` with `<FullPageLoader variant="error" title="..." description="..." />`.
4. **Unit Tests**:
   - `src/components/ui/full-page-loader.test.tsx`: Tests rendering of loading state, custom copy, error state, and branding elements.

## Spec Self-Review
- Placeholders check: None (all specs explicit).
- Consistency check: Uses existing design system tokens (`bg-clinical-surface`, `bg-card/80`, `border-border/50`).
- Scope check: Well-bounded component + router integration.
