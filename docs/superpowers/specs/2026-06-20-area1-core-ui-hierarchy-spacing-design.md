# Area 1 Core UI Hierarchy And Spacing Design

Date: 2026-06-20
Status: Draft for user review

## 1. Summary

This design defines the first full-app redesign pass for the core UI system.

The pass is intentionally conservative:

- keep the existing product direction
- avoid large visual disruption
- improve hierarchy and spacing first
- prioritize mobile readability before broader visual flourish

The first implementation slice inside this pass is limited to:

- `SectionHeading`
- `StatePanel`

These two components were chosen because they affect a large share of the app surface:

- student pages
- admin pages
- loading states
- empty states
- error states
- section intros
- section-level call to action placement

The goal is to make the app feel lighter, clearer, and more professional on mobile while preserving the current structure and product behavior.

## 2. Goals

### Primary Goals

- improve visual hierarchy across section intros and state blocks
- make mobile layouts feel less dense without removing important information
- create a more consistent vertical rhythm between eyebrow, title, description, and actions
- make `StatePanel` easier to scan in loading, empty, and error conditions
- keep student and admin surfaces on one shared component system
- preserve existing component APIs wherever possible
- allow only light internal markup updates when necessary to improve hierarchy

### Non-Goals

- redesigning the full app in this pass
- changing business logic, API calls, routing, or state behavior
- introducing a new visual brand direction
- creating multiple new component variants for future flexibility
- redesigning tables, forms, cards, or shells in the same change set
- hiding large amounts of mobile content with collapsible logic in this pass

## 3. Locked Product Decisions

- the direction is `polish konservatif`
- the focus is `hierarchy + spacing`
- the first priority is `mobile lebih lega`
- the intensity is `sedang`
- the first component slice is:
  - `SectionHeading`
  - `StatePanel`
- student and admin should share the same structural system
- student and admin may differ only through a light tone treatment
- implementation may use `style + markup ringan`
- component APIs should remain stable unless a change becomes strictly necessary

## 4. Current State

### 4.1 SectionHeading

`SectionHeading` currently provides:

- optional `eyebrow`
- `title`
- optional `description`
- optional `actions`

The current component already works structurally, but its presentation is still too uniform in several places:

- the title is strong, but the surrounding spacing does not always create enough breathing room on mobile
- the action block can feel attached too closely to the text content depending on the page
- the description width is not always constrained tightly enough for compact screens

This means the component is usable, but not yet optimized for the audit goals of stronger hierarchy and lighter mobile density.

### 4.2 StatePanel

`StatePanel` already supports:

- `loading`
- `empty`
- `error`

It includes:

- icon
- title
- description
- optional action
- loading skeleton treatment

The current panel is functionally solid, but it still feels slightly too dense in mobile contexts:

- icon and copy grouping can feel visually heavy
- the title-to-description rhythm could be calmer
- action placement is correct but can be made more clearly “next step”
- loading skeletons still carry more visual noise than needed

### 4.3 Shared design observation

Across the app, these two components often appear near:

- `SurfacePanel`
- `MetricPill`
- page-level shell headers

Because of that, they must become a stable hierarchy anchor before other core redesign areas move forward.

## 5. Design Decision

### 5.1 Recommended approach

Use an `editorial mobile hierarchy` approach with light markup refinement.

This approach keeps the current product language but makes the layout feel more intentional through:

- stronger vertical grouping
- more measured spacing
- calmer description widths
- clearer CTA separation
- simpler loading rhythm

This is the recommended approach because it offers the best balance of:

- low implementation risk
- high reuse across many pages
- visible improvement without a disruptive redesign

### 5.2 Alternatives considered

#### A. Editorial mobile hierarchy

Kelebihan:

- strongest fit for the audit goals
- improves mobile breathing room quickly
- scales well to both student and admin surfaces
- keeps future passes easier because hierarchy rules become clearer

Kekurangan:

- visual uplift is meaningful but still conservative

This is the chosen approach.

#### B. Compact utility

Kelebihan:

- efficient for dense operational pages
- fast to implement

Kekurangan:

- does not solve the “boring / flat / crowded” feeling strongly enough
- risks preserving the current dense feel on mobile

This is rejected for the first redesign pass.

#### C. Soft card emphasis

Kelebihan:

- more visually expressive
- stronger “premium” feel immediately

Kekurangan:

- higher risk of mismatch across admin and student areas
- can blur the conservative scope boundary

This is rejected for Area 1 because the app needs system stability first.

## 6. Component Design

### 6.1 SectionHeading

#### Structural intent

`SectionHeading` should remain one shared component with the same external API.

The component continues to express the same four semantic layers:

1. context via `eyebrow`
2. primary focus via `title`
3. explanation via `description`
4. next step via `actions`

#### Visual behavior

On mobile:

- text content stacks vertically with clearer breathing room
- `actions` should sit below the text block and feel like the next step, not a competing column
- description width should be visually narrower so reading feels lighter

On desktop:

- heading text and actions may still align in one row
- the alignment should feel more stable and less compressed
- long descriptions should still remain visually bounded

#### Hierarchy rules

- `eyebrow` acts as a subtle context marker, not a visual anchor
- `title` remains the dominant element
- `description` should be readable but clearly secondary
- `actions` should gain clarity through spacing, not louder styling

#### Student vs admin tone

Student and admin use the same structure.

The only intentional difference:

- student can feel a touch softer and roomier
- admin can feel a touch firmer and more direct

This tone difference should come from surrounding surface usage or text color nuance, not from different layout logic.

### 6.2 StatePanel

#### Structural intent

`StatePanel` should preserve its current API and state logic:

- `loading`
- `empty`
- `error`

The redesign should focus on presentation only.

#### Visual behavior

On mobile:

- icon, title, description, and action should read as one clean vertical flow
- the icon should support the message, not dominate it
- action spacing should clearly indicate “what to do next”

On desktop:

- the panel may still use a slightly broader composition
- it should remain calm and readable instead of looking like a dense utility block

#### Variant behavior

`loading`

- should feel lighter than now
- skeleton rhythm should be simplified
- decorative loading weight should be reduced

`empty`

- should feel calm and encouraging
- message should be easy to parse in one glance

`error`

- should stay the strongest state
- emphasis should come from clear contrast and border treatment, not visual aggression

#### Hierarchy rules

- title is the first scan target
- description is concise support text
- action is always the final and clearest next step
- skeletons should support perceived structure, not add clutter

## 7. Spacing And Typography Rules

### 7.1 SectionHeading rhythm

Mobile rhythm should emphasize:

- tighter `eyebrow -> title`
- roomier `title -> description`
- clearly separated `description -> actions`

Desktop rhythm should emphasize:

- stable alignment with action controls
- capped text width
- enough whitespace to keep the section opening feeling intentional

### 7.2 StatePanel rhythm

Mobile rhythm should emphasize:

- comfortable outer padding
- consistent spacing between icon and copy
- enough space before actions
- less visually busy loading placeholders

Desktop rhythm should emphasize:

- clean composition
- readability before compactness
- strong but not oversized title presence

### 7.3 Typography rules

For both components:

- titles should use stronger hierarchy than body copy, but not become oversized on mobile
- descriptions should stay readable with controlled line length
- eyebrow text should stay subtle and contextual
- no new flashy type styling should be introduced in this pass

## 8. Implementation Scope

### 8.1 Files in scope

Primary files:

- [section-heading.tsx](</E:/Projek TRY OYT/src/components/ui/section-heading.tsx:1>)
- [state-panel.tsx](</E:/Projek TRY OYT/src/components/ui/state-panel.tsx:1>)

Secondary context files for validation only:

- [surface-panel.tsx](</E:/Projek TRY OYT/src/components/ui/surface-panel.tsx:1>)
- [product-shell.tsx](</E:/Projek TRY OYT/src/components/layout/product-shell.tsx:1>)
- [admin-shell.tsx](</E:/Projek TRY OYT/src/components/layout/admin-shell.tsx:1>)

### 8.2 Allowed changes

- class and spacing changes
- max-width and stack-order refinement
- light internal markup rearrangement
- loading skeleton simplification
- accessibility-safe hierarchy adjustments

### 8.3 Disallowed changes

- breaking the public component props unless unavoidable
- introducing unrelated visual refactors in other core components
- changing page behavior or state semantics
- redesigning shell systems in the same implementation batch

## 9. Risks And Mitigations

### Risk 1: visual changes ripple too widely

Because both components are reused broadly, even small changes affect many pages.

Mitigation:

- preserve API
- keep markup adjustments light
- verify in representative student and admin pages

### Risk 2: mobile improves but desktop regresses

Mitigation:

- validate both stacked and split layouts
- keep desktop width and alignment constraints explicit

### Risk 3: admin and student lose tonal distinction

Mitigation:

- keep one shared structure
- allow only subtle tone differences instead of divergent layout behavior

## 10. Verification Strategy

Implementation for Area 1 should verify:

- `SectionHeading` still renders correctly with and without:
  - eyebrow
  - description
  - actions
- `StatePanel` still renders correctly for:
  - loading
  - empty
  - error
- mobile stack order remains readable
- action placement remains clear
- no component API regressions are introduced

Representative page checks should include at least:

- one student page using `SectionHeading`
- one student page using `StatePanel`
- one admin page using `StatePanel`

## 11. Recommended Next Step

After user approval of this design:

1. write a focused implementation plan for Area 1
2. implement `SectionHeading` and `StatePanel`
3. verify their appearance on representative student and admin pages
4. then continue to the next core component slice:
   - `SurfacePanel`
   - `MetricPill`

