# Universal Profile Management Design

Date: 2026-05-06
Status: Draft for user review

## 1. Summary

This design adds a single `/profile` surface that works for every authenticated account type in the product:

1. `pendaftar_baru`
2. `pro`
3. `admin`

The page lets users:

1. change display name
2. change password using current-password verification
3. upload or replace a profile photo
4. log out from the current session

The goal is to give every account a consistent self-service profile flow without duplicating profile logic across the student app, admin app, and subscription surface.

## 2. Goals

### Primary Goals

- add one dedicated `/profile` page for all authenticated users
- let users update `full_name`
- let users change password using `current_password`, `new_password`, and confirmation
- let users upload a profile photo to Supabase Storage
- show a logout action inside the profile page
- keep a profile shortcut and logout shortcut available from the surrounding shell
- preserve current role-based app access without changing who can enter `/app`, `/admin`, or `/subscription`

### Non-Goals

- changing user email addresses
- adding image cropping, compression workflows, or avatar editing tools
- redesigning the whole dashboard shell layout
- changing role assignment rules
- changing subscription approval behavior
- adding multi-session management or device session revocation

## 3. Scope

### In Scope

- add a new authenticated route for `/profile`
- add profile page UI and reusable profile form blocks
- add profile data helpers for read, name update, password update, avatar upload, and avatar replacement
- add `avatar_url` support to the shared profile model
- add Supabase migration for profile avatar storage and profile column support
- add shell shortcuts to profile and logout for all account types
- add tests for profile flows and storage policies

### Out of Scope

- changing login page behavior
- changing user onboarding or registration flow
- adding public-facing user profile pages
- exposing avatar management in admin payment or review tools
- changing analytics or tryout features

## 4. Product Decisions Locked

- the profile experience lives at `/profile`, not inside each dashboard page
- the profile page is shared across all roles, while the surrounding shell adapts to the active role
- password change requires `current_password`
- profile photos are uploaded to Supabase Storage, not stored as manual external URLs
- logout is available both in `/profile` and as a shortcut in role-specific shells or surfaces
- role and email remain read-only on the profile page
- avatar data is stored in `profiles.avatar_url` as a storage path, not a full public URL

## 5. Experience Design

### Route And Presentation

The product should expose one top-level route:

- `/profile`

This route must be accessible to any authenticated user, including `pendaftar_baru`, even though that user may not be allowed to enter `/app`.

The visual wrapper should depend on role:

- `admin` uses `AdminShell`
- `pro` uses `ProductShell`
- `pendaftar_baru` uses a lightweight authenticated subscription-style surface

The page body should stay structurally consistent across roles so users see the same profile actions in the same order.

### Page Sections

The profile page should contain four clear sections:

1. account identity summary
2. change display name
3. change password
4. logout

The identity summary should display:

- avatar preview
- full name
- email
- role label

The avatar upload action should live next to the identity summary so the photo feels like part of one profile card, not an unrelated setting.

### Interaction Model

Each action area should behave independently:

- name update has its own loading and success/error state
- password update has its own loading and success/error state
- avatar upload has its own loading and success/error state
- logout has its own pending state

This prevents one failing action from blocking the rest of the page.

## 6. Data Model Direction

The existing `public.profiles` table already stores identity basics and supports self-updates through RLS. It should be extended with one new field:

- `avatar_url text`

Recommended meaning:

- `avatar_url` stores the storage object path, such as `<user-id>/avatar.webp`
- frontend derives a public or signed URL when rendering the image

The shared profile type in the frontend should expand from:

- `id`
- `email`
- `fullName`
- `role`

to:

- `id`
- `email`
- `fullName`
- `role`
- `avatarUrl`

No changes should be made to role storage or role mutation rules.

## 7. Backend And Storage Direction

### Profile Reads And Writes

Profile read operations should fetch the authenticated user row from `public.profiles`.

Display name updates should write to two places:

1. `auth.updateUser({ data: { full_name } })`
2. `public.profiles.full_name`

This keeps Supabase auth metadata and the app's own `profiles` table aligned.

### Password Change

Password updates should use Supabase Auth from the browser client with:

- `current_password`
- `password`

The frontend should assume this is the canonical path and normalize Supabase errors into user-friendly Indonesian messages.

### Avatar Upload

A new storage bucket should be created for profile images, for example:

- `profile-avatars`

Recommended bucket rules:

- authenticated users can upload only inside their own top-level folder
- authenticated users can read only their own avatar objects
- authenticated users can delete only their own avatar objects
- admin access may be added for reads if future admin tooling needs it
- only image MIME types should be allowed
- file size should be capped to a small image-safe limit

Recommended path pattern:

- `<auth.uid()>/avatar.<ext>`

Recommended replacement behavior:

- upload the new file
- update `profiles.avatar_url`
- delete the previous avatar object if it existed and is different from the new one

This keeps storage tidy while avoiding deletion before a successful replacement.

## 8. Frontend Architecture Direction

### Route Structure

The router should add a dedicated authenticated route for `/profile`.

This should not sit behind the current `AppRouteGuard` because `pendaftar_baru` users would be redirected away before reaching it.

Recommended direction:

- introduce a generic authenticated-only guard for routes that require login but not app or admin entitlement
- mount `/profile` behind that guard
- keep `/app` and `/admin` behind their current role-aware guards

### Page Composition

Recommended component structure:

- `ProfilePage`
- reusable profile section components for identity, name, password, and logout
- a small role-aware shell wrapper or helper that selects the correct layout container

Recommended API helpers:

- `getCurrentProfile()`
- `updateCurrentProfileName()`
- `updateCurrentUserPassword()`
- `uploadCurrentUserAvatar()`
- `deleteProfileAvatar()` if cleanup is separated

These helpers should live in one profile-focused module rather than being split across unrelated pages.

### Session Integration

The profile page should use the existing session provider as the source of:

- authenticated user id
- email
- current auth session presence

The page may still read `profiles` for app-level fields such as:

- `full_name`
- `role`
- `avatar_url`

## 9. Shell Integration

Every authenticated account surface should expose profile and logout shortcuts.

Recommended shell changes:

- `ProductShell` adds a profile navigation item and a logout action
- `AdminShell` adds a profile navigation item and a logout action
- the authenticated subscription surface adds a profile CTA and a logout action when relevant

These shortcuts should remain quick-access actions only. The actual editing forms still live at `/profile`.

The shell shortcuts should preserve current visual language instead of introducing a brand-new navigation style.

## 10. Validation And Error Handling

### Display Name

Frontend validation should:

- trim whitespace
- reject empty names
- keep the field editable after an error

### Password

Frontend validation should require:

- current password is present
- new password is present
- confirmation matches new password

The page should avoid clearing the current password field until a successful password change is confirmed, or deliberately clear all password fields immediately after success.

### Avatar

Frontend validation should reject:

- non-image files
- files above the configured limit

The UI should show clear state for:

- uploading
- success
- failure

If avatar upload succeeds but old-avatar deletion fails, the profile update should still be treated as successful and the deletion issue should be logged or surfaced as a soft warning.

## 11. Testing Strategy

Tests should cover:

- migration adds `profiles.avatar_url`
- migration creates the avatar storage bucket and policies
- profile API fetches the current profile row correctly
- name update syncs auth metadata and `profiles.full_name`
- password update sends `current_password` and new password correctly
- avatar upload writes to the expected storage path and updates `profiles.avatar_url`
- profile page renders for authenticated users across role wrappers
- `pendaftar_baru` can access `/profile` without being forced into `/app`
- shell shortcuts point to `/profile` and expose logout actions
- validation messages appear for invalid password confirmation and invalid avatar files
- logout still redirects users back to `/auth/login`

## 12. Risks And Constraints

- the current routing model is role-centered, so `/profile` introduces a new authenticated-but-not-entitled route shape that must not break existing guard behavior
- current profile bootstrap logic only tracks `full_name`; it will need careful expansion to include `avatar_url`
- storage cleanup after avatar replacement can create edge cases if object deletion is attempted too early
- `pendaftar_baru` does not currently have a shared shell component, so the first version should prefer a minimal authenticated wrapper over a large new layout system
- this workspace currently does not appear to be an initialized git repository, so the spec can be written locally but may not be commit-ready until git is available
