# Design Spec: Modern SaaS Layout (ProductShell Overhaul)

## 1. Overview
The current `ProductShell` layout feels like a "reskin" of an old template. To achieve true "Clinical Elegance", we will completely tear down the old layout and rebuild it into a **Modern SaaS Floating Layout**. This structure separates the navigation (sidebar) from the main content space, making the app feel premium, airy, and hyper-focused.

## 2. Architecture & Layout Structure
We will replace the existing grid layout (`lg:grid-cols-[17.5rem_minmax(0,1fr)]`) with a modern, gap-based flex/grid container.

### 2.1 The Canvas (Root Background)
- **Background**: `bg-clinical-surface` (`#f8fafc`).
- **Padding**: Global padding around the entire application (e.g., `p-4 lg:p-6`) so the internal panels appear "floating".

### 2.2 The Sidebar (Floating Nav)
- **Structure**: A standalone, rounded panel on the left (e.g., `w-[260px]`).
- **Visuals**:
  - Background: Glassmorphic white (`bg-white/70 backdrop-blur-md`).
  - Border: Subtle outline (`border border-clinical-border`).
  - Radius: Rounded corners (`rounded-2xl`).
  - Shadow: Soft elevation (`shadow-sm`).
- **Behavior**: Stays sticky on the left side. Can be collapsed into an icon-only mode for maximum focus.

### 2.3 Main Content Area
- **Structure**: The flex-1 container on the right side.
- **Visuals**:
  - Background: Solid white (`bg-white`) for maximum contrast against the surface.
  - Border: `border border-clinical-border`.
  - Radius: `rounded-[1.5rem]` or `rounded-[2rem]` to give it a distinctive "canvas" feel.
  - Shadow: `shadow-sm`.
- **Inner Padding**: Ample breathing room (`px-8 py-8`).

## 3. Interaction Design
- **Collapsing**: When collapsed, the sidebar shrinks to `w-20` (icon only). The main content area smoothly expands (`transition-all duration-300`).
- **Active States**: Active menu items will use a soft clinical accent background (`bg-clinical-accent/10 text-clinical-accent-dark`) instead of the heavy old `bg-white/20 text-white`.
- **Hover States**: Inactive items will hover to a soft gray/slate background.

## 4. Components Impacted
- `src/components/layout/product-shell.tsx` (Complete rewrite of DOM hierarchy).
- `src/pages/app/*` (Minor padding adjustments if existing pages assumed zero outer padding, though the content container will encapsulate them).

## 5. Scope & Limitations
- This spec **only** covers the core `ProductShell` layout and sidebar navigation UI.
- It does **not** include rebuilding the internal components of the Dashboard or Tryout pages yet. Those will be subsequent sub-projects once the shell is established.

## 6. Implementation Plan
1. Delete the existing HTML structure inside `ProductShell`.
2. Construct the new root container (`min-h-screen bg-clinical-surface p-4 lg:p-6 flex gap-6`).
3. Construct the Floating Sidebar component.
4. Construct the Main Content container.
5. Wire up the collapse/expand state logic to the new sidebar.
