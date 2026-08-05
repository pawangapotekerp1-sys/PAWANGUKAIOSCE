# Pawang Apoteker - Phase 1 Frontend Design Spec

## Goal
Redesign the frontend UI from scratch using `shadcn/ui` as a reference while strictly keeping the existing backend untouched. This Phase 1 focuses on establishing the global Design System (color, typography, layout) and redesigning the Authentication (Login) page as the first implementation.

## 1. Vibe & Aesthetic: "Clinical Elegance"
The aesthetic aims for a clean, precise, and professional feel, much like a modern medical journal or high-end science lab. It minimizes cognitive load to aid in intensive studying (Tryout/Apoteker preparation) while instilling trust and accuracy.

## 2. Token System (Design Tokens)

### 2.1 Color Palette
- **Background**: `#FFFFFF` (Pristine White) - Clean base to reduce visual noise.
- **Surface**: `#F8FAFC` (Slate 50) - Subtle separation for cards, dialogs, and panels.
- **Primary Text**: `#0F172A` (Deep Navy / Slate 900) - Less harsh than pure black, adds an elegant tone.
- **Secondary Text**: `#64748b` (Slate 500) - For supporting copy and metadata.
- **Primary Accent**: `#06B6D4` (Icy Cyan) - High-energy but calm color representing medical/clinical freshness.
- **Success State**: `#84CC16` (Lime 500) - For correct answers or success messages.
- **Error State**: `#EF4444` (Red 500) - For incorrect answers or errors.
- **Borders**: `#E2E8F0` (Slate 200) - Very subtle, crisp 1px borders.

### 2.2 Typography
- **Display / Headers / Metrics**: `Space Grotesk`
  - Used for large headers, scores, timers, and data display.
  - Gives a structured, slightly technical edge.
- **Body / UI Elements**: `Inter`
  - Used for buttons, forms, paragraphs, and general UI text.
  - Chosen for maximum legibility on screen.

### 2.3 Layout & Spacing
- **Spacing**: Strict adherence to a 4px/8px grid.
- **Borders & Shadows**: Flat and crisp design. Use 1px borders (`border-slate-200`) instead of heavy drop shadows to maintain the clinical, precise look. Corner radius standard is `rounded-lg` (8px).

## 3. Component Details: Authentication Page
The first screen to be implemented is the Login Page.

- **Layout Structure**: 50/50 Split Screen.
  - **Left Pane (Form)**: Pure white background (`#FFFFFF`). Centered login form. Minimalist inputs with cyan focus rings.
  - **Right Pane (Brand/Graphic)**: Gradient background (`#0891B2` to `#06B6D4`). Contains the core value proposition of Pawang Apoteker (e.g., "Platform Tryout Presisi") with subtle medical/academic motifs or clean typography.

## 4. Implementation Scope for Phase 1
1. **Global CSS**: Update `src/index.css` with the new color CSS variables matching the Clinical Elegance palette.
2. **Fonts**: Integrate `Space Grotesk` and `Inter` via `@fontsource` or Google Fonts in `index.html` or CSS.
3. **Tailwind Config**: Update `tailwind.config.ts` (or equivalent in v4) to map colors and fonts.
4. **Login Page**: Overwrite `src/pages/auth/login-page.tsx` entirely to match the 50/50 split design.

## 5. Constraints
- Do **not** modify any backend API routes, endpoints, or database schemas.
- Ensure the new Login UI seamlessly connects to `src/lib/api/auth-api.ts`.

## 6. Open Questions
- None. The design is scoped, constrained, and approved by the user.
