# Frontend Phase 1: Foundation UI & Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Clinical Elegance" design system and refactor the Login Page to use a 50/50 split layout.

**Architecture:** Use existing React 19, Tailwind CSS v4, and Radix/shadcn setup. No backend modifications.

**Tech Stack:** React, Tailwind CSS 4, Radix UI.

## Global Constraints

- Do not modify any backend API routes, endpoints, or database schemas.
- Ensure the new Login UI seamlessly connects to `src/lib/api/auth-api.ts`.

---

### Task 1: Establish Design Tokens & Fonts

**Files:**
- Modify: `src/index.css`
- Modify: `index.html` 

**Interfaces:**
- Consumes: N/A
- Produces: CSS Variables for colors, `font-sans` and `font-display` utility classes via Tailwind CSS v4 `@theme` directive in `index.css`.

- [ ] **Step 1: Import Fonts**
Modify `index.html` to add Google Fonts links for Space Grotesk and Inter in the `<head>`.
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Update CSS Variables & Tailwind Theme**
Modify `src/index.css` to add the new tokens using Tailwind v4 syntax.
```css
@theme {
  --color-clinical-bg: #ffffff;
  --color-clinical-surface: #f8fafc;
  --color-clinical-text-primary: #0f172a;
  --color-clinical-text-secondary: #64748b;
  --color-clinical-accent: #06b6d4;
  --color-clinical-accent-dark: #0891b2;
  --color-clinical-success: #84cc16;
  --color-clinical-error: #ef4444;
  --color-clinical-border: #e2e8f0;

  --font-sans: "Inter", sans-serif;
  --font-display: "Space Grotesk", sans-serif;
}
```

- [ ] **Step 3: Verify CSS Syntax**
Run `npm run build` to verify Tailwind v4 compiles correctly with the new `@theme` directive.
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add index.html src/index.css
git commit -m "feat(ui): add clinical elegance design tokens and fonts"
```

### Task 2: Refactor Login Page

**Files:**
- Modify: `src/pages/auth/login-page.tsx`

**Interfaces:**
- Consumes: `src/lib/api/auth-api.ts` (existing API logic)
- Produces: A new 50/50 split layout UI for the login page route.

- [ ] **Step 1: Replace UI in `src/pages/auth/login-page.tsx`**
Rewrite the JSX to use the 50/50 split layout. The left side holds the form (white background), the right side holds the cyan gradient. Use the new `clinical-*` theme colors. Maintain state and API integration exactly as it is.

- [ ] **Step 2: Verify Compilation**
Run `npm run build` to ensure the new UI compiles without errors.
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/pages/auth/login-page.tsx
git commit -m "feat(ui): implement split layout for login page"
```
