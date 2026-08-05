# Pawang Masuk Apoteker Homepage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single polished landing page for Pawang Masuk Apoteker using the approved palette, ready to serve as the visual foundation of the product.

**Architecture:** Use a Vite + React + TypeScript app with a small route shell, Tailwind for styling, and a dedicated homepage component that owns the visual composition. Keep the initial implementation intentionally narrow: one production-grade page with test coverage for key content and structure.

**Tech Stack:** Vite, React, TypeScript, React Router, Tailwind CSS, Vitest, React Testing Library

---

## Chunk 1: Project Foundation

### Task 1: Scaffold the app and install dependencies

**Files:**
- Create: `package.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Scaffold a Vite React TypeScript app**

Run: `npm create vite@latest . -- --template react-ts`

- [ ] **Step 2: Install app dependencies**

Run: `npm install react-router`

- [ ] **Step 3: Install styling and testing dependencies**

Run: `npm install tailwindcss @tailwindcss/vite`

Run: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom`

- [ ] **Step 4: Configure Tailwind and Vitest**

Modify:
- `vite.config.ts`
- `vitest.config.ts`
- `src/index.css`

- [ ] **Step 5: Verify the toolchain is wired up**

Run: `npm run build`

Expected: successful production build

## Chunk 2: TDD for Homepage Structure

### Task 2: Write the homepage tests first

**Files:**
- Create: `src/pages/home-page.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test for the landing page shell**

Test behaviors:
- renders product name `Pawang Masuk Apoteker`
- shows hero headline in Bahasa Indonesia
- shows primary CTA `Mulai Try Out`
- shows key sections for fitur and pricing preview

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/home-page.test.tsx`

Expected: FAIL because the page content does not exist yet

## Chunk 3: Homepage Implementation

### Task 3: Implement the landing page and theme system

**Files:**
- Create: `src/pages/home-page.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Create the homepage component**

Build:
- hero
- feature section
- simulation preview section
- pricing preview section
- compact footer

- [ ] **Step 2: Apply the requested visual language**

Use:
- teal-led palette
- cream support tones
- gold and pharmacy green accents
- responsive layout
- refined motion and hover feedback

- [ ] **Step 3: Keep structure ready for future expansion**

Add a simple router shell or page shell that can grow into the wider app later.

- [ ] **Step 4: Run the homepage test again**

Run: `npx vitest run src/pages/home-page.test.tsx`

Expected: PASS

## Chunk 4: Final Verification

### Task 4: Verify the page in build and dev mode

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run`

Expected: PASS

- [ ] **Step 2: Run a production build**

Run: `npm run build`

Expected: PASS

- [ ] **Step 3: Start the dev server**

Run: `npm run dev -- --host 0.0.0.0 --port 4173`

Expected: local development URL available for review

- [ ] **Step 4: Note blockers**

If git-specific steps are unavailable because the workspace is not a git repository, record that and proceed without commit actions.
