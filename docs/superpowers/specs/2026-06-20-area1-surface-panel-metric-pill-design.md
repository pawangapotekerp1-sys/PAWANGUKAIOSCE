# Area 1 SurfacePanel And MetricPill Design

Date: 2026-06-20
Status: Draft for user review

## 1. Summary

This design defines the second implementation slice inside Area 1 of the UI redesign pass.

The slice is intentionally conservative:

- keep the current component APIs stable
- improve hierarchy and spacing before stronger visual expression
- prioritize mobile breathing room
- keep the overall tone calm, modern, and professional

The implementation scope for this slice is limited to:

- `SurfacePanel`
- `MetricPill`

These two components sit underneath a large amount of page content across both student and admin surfaces, so small improvements here can lift perceived polish across the app without touching product logic.

## 2. Goals

### Primary Goals

- make panels feel lighter and less crowded on mobile
- create clearer separation between panel frame and panel content
- improve internal hierarchy so important content feels more intentional
- make `MetricPill` easier to scan without making it louder
- preserve the existing shared component system for student and admin pages
- keep changes low-risk by focusing on spacing, density, and tone

### Non-Goals

- redesigning page layouts in this slice
- introducing a new card system
- changing business logic, routing, API calls, or state behavior
- turning `MetricPill` into a large emphasis badge
- adding decorative shadows, glows, or flashy motion

## 3. Locked Product Decisions

- the redesign mode remains `polish konservatif`
- the primary focus remains `hierarchy + spacing`
- the strongest priority is still `mobile lebih lega`
- the tone is `tenang dan profesional`
- the preferred approach is `Breathing Panels`
- `SurfacePanel` is the main priority within this slice
- `MetricPill` supports the hierarchy and should become cleaner, not louder

## 4. Current State

### 4.1 SurfacePanel

`SurfacePanel` is the shared frame for many cards and content blocks. It already provides:

- tone variants
- panel padding through shared tokens
- shared transition behavior

The component is structurally sound, but it still contributes to a dense feeling in several places:

- panels can feel slightly too heavy on mobile when stacked closely
- content inside the frame does not always feel separated cleanly from the panel edge
- stronger tone variants can visually outweigh the information inside them

This means the component works, but it is not yet helping the hierarchy enough.

### 4.2 MetricPill

`MetricPill` currently works as a compact badge for status, metrics, and small supporting signals. It already provides:

- multiple tones
- optional icon
- uppercase mono styling
- subtle interaction states

The current pill is usable, but still has a few issues relative to the audit goals:

- it feels slightly bulky for how secondary its role often is
- letterspacing and padding make some pills feel louder than the surrounding content
- on dense cards, multiple pills can compete with the main heading instead of supporting it

## 5. Design Decision

### 5.1 Recommended approach

Use a `Breathing Panels` approach.

This approach keeps the shared component system intact while improving perceived quality through:

- lighter panel density
- more measured padding on mobile
- calmer panel framing
- smaller and cleaner metric pills
- stronger distinction between primary content and supporting metadata

This is the recommended approach because it gives the best balance of:

- visible improvement
- low implementation risk
- easy reuse across many page types

### 5.2 Alternatives considered

#### A. Breathing Panels

Kelebihan:

- strongest match for the audit goals
- improves mobile comfort first
- helps many pages without page-specific redesign
- keeps the visual system calm and cohesive

Kekurangan:

- the uplift is mostly felt through polish, not dramatic expression

This is the chosen approach.

#### B. Structured Panels

Kelebihan:

- stronger information grouping
- clearer editorial feel inside some cards

Kekurangan:

- can require broader markup changes in consuming pages
- higher risk of ripple effects beyond this slice

This is not chosen for the current batch.

#### C. Quiet Metrics

Kelebihan:

- fast and low risk
- improves scanning of badges quickly

Kekurangan:

- does not solve the card density issue strongly enough
- overall page improvement would feel too small

This is not chosen because `SurfacePanel` is the bigger leverage point.

## 6. Component Design

### 6.1 SurfacePanel

#### Structural intent

`SurfacePanel` remains the same reusable frame component with the same external API.

The redesign should improve:

- how the panel sits in the layout
- how much breathing room the content appears to have
- how strongly each tone draws attention

#### Visual behavior

On mobile:

- panel padding should feel more deliberate and less cramped
- content should appear to have cleaner margin from the panel edge
- stacked panels should feel easier to scan one by one

On desktop:

- the panel should still feel substantial, but not heavy
- stronger tones should remain readable without overpowering internal text

#### Hierarchy rules

- the panel frame is a container, not the main event
- the content inside should remain the first scan target
- accent and warm tones may differentiate importance, but not dominate the page
- transitions should stay subtle and supportive

### 6.2 MetricPill

#### Structural intent

`MetricPill` keeps its API and tone model.

The redesign should make it feel:

- smaller in perceived weight
- easier to scan in a group
- more clearly secondary to nearby headings and actions

#### Visual behavior

On mobile:

- pill height should feel compact but still comfortable
- label scanning should remain easy at a glance
- icon and text spacing should stay tidy

On desktop:

- pills can still look sharp and intentional
- they should not draw more attention than the card title or main CTA

#### Hierarchy rules

- pills support context, status, and metadata
- they should never overpower section titles
- color differences should signal meaning, not become decoration

## 7. Spacing And Typography Rules

### 7.1 SurfacePanel rhythm

The panel should feel lighter through:

- measured outer padding
- more consistent edge-to-content spacing
- reduced visual heaviness from frame treatment

Mobile should gain the strongest improvement, while desktop should preserve stability.

### 7.2 MetricPill rhythm

The pill should feel cleaner through:

- slightly reduced visual bulk
- balanced icon-to-label spacing
- controlled uppercase styling
- a more compact resting silhouette

### 7.3 Typography rules

For this slice:

- no new typography system should be introduced
- `MetricPill` may retain its utility tone, but spacing should reduce perceived shouting
- panel framing should support typography hierarchy instead of competing with it

## 8. Implementation Scope

### 8.1 Files in scope

Primary files:

- [surface-panel.tsx](</E:/Projek TRY OYT/src/components/ui/surface-panel.tsx:1>)
- [metric-pill.tsx](</E:/Projek TRY OYT/src/components/ui/metric-pill.tsx:1>)

Secondary validation files:

- [ui-primitives.test.tsx](</E:/Projek TRY OYT/src/components/ui/ui-primitives.test.tsx:1>)
- representative student/admin pages that already consume these components

### 8.2 Allowed changes

- spacing and density adjustments
- tone tuning that stays within the current design direction
- subtle class refinement for calmer hierarchy
- accessibility-safe interaction polish

### 8.3 Disallowed changes

- changing component behavior or data flow
- introducing new business states
- redesigning parent page layouts in this batch
- expanding the API unless strictly necessary

## 9. Risks And Mitigations

### Risk 1: panel tone becomes too soft and loses structure

Mitigation:

- keep borders and surfaces readable
- validate across default, muted, accent, and warm tones

### Risk 2: pills become too small or lose clarity

Mitigation:

- preserve legibility and click/tap safety where applicable
- keep text contrast and icon spacing explicit

### Risk 3: global component changes ripple into many pages

Mitigation:

- preserve API shape
- verify in representative student and admin pages
- keep the implementation focused on presentational classes only

## 10. Verification Strategy

Implementation for this slice should verify:

- `SurfacePanel` still renders all supported tones correctly
- `MetricPill` still renders all supported tones correctly
- panel density feels lighter in representative card layouts
- pills remain readable and do not dominate nearby headings
- no regressions are introduced to existing component APIs

Representative checks should include at least:

- one student page with stacked panels
- one admin page with panel-based metrics
- one page where multiple `MetricPill` instances appear together

## 11. Recommended Next Step

After user approval of this design:

1. write the implementation plan for the `SurfacePanel + MetricPill` slice
2. add or update focused component tests first
3. implement the smallest presentational changes that satisfy the tests
4. verify on representative student and admin pages
