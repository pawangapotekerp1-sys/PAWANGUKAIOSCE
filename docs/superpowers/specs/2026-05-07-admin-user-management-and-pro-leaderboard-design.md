# Admin User Management And Pro Leaderboard Design

Date: 2026-05-07
Status: Draft for user review

## 1. Summary

This design adds two connected product surfaces:

1. an admin-only user management module
2. a pro-only leaderboard module

The admin module gives admins a controlled way to create accounts without public signup, inspect users by role-driven operational filters, and change user roles.

The leaderboard module gives pro users a new sidebar destination that shows the top 10 ranked participants for:

1. overall performance
2. Clinical Science
3. Social, Behavioral & Administrative Pharmacy
4. Pharmaceutical Science

The implementation should preserve the current Supabase-first architecture, keep account creation inside trusted backend flows, and avoid expanding payment or subscription workflows in this phase.

## 2. Goals

### Primary Goals

- add an admin user management page under the admin module
- let admins create new accounts without public registration
- send a set-password email when an admin creates an account
- let admins update a user's role between `pendaftar_baru`, `pro`, and `admin`
- let admins filter users by role-based operational groups
- add forgot-password support to the login flow
- add a user-editable leaderboard alias on the profile page
- add a pro-only leaderboard page with category switching
- rank only `pro` users
- show only the top 10 rows per leaderboard category

### Non-Goals

- reworking payment submission, payment verification, or subscription approval flows
- introducing a new paid-state role or new subscription states
- opening public self-registration again
- building a full admin analytics suite for user activity
- adding friend systems, profile pages, or social features around leaderboard entries
- exposing the full leaderboard beyond 10 rows in this first version

## 3. Scope

### In Scope

- new admin route and page for user management
- backend admin flow for account creation using trusted Supabase admin methods
- role update flow for admins
- forgot-password request flow in login
- reset or set-password route used by invite and recovery links
- `leaderboard_alias` support in profiles
- new pro route and sidebar item for leaderboard
- leaderboard queries for overall and per-block top 10 rankings
- tests for the new admin, auth, profile, and leaderboard flows

### Out of Scope

- changing how `/subscription` currently works
- role derivation from payment or subscription state
- custom SMTP setup itself
- redesigning all admin pages
- adding historical charts or pagination to leaderboard
- hiding leaderboard rows based on privacy preferences beyond alias masking

## 4. Product Decisions Locked

- user filters in admin are role-driven for this phase:
  - `user aktif` means `role = 'pro'`
  - `belum bayar` means `role = 'pendaftar_baru'`
  - `admin` means `role = 'admin'`
- only admins can create new accounts
- admin-created accounts use email-based password setup, not admin-specified passwords
- forgot-password must remain available as a fallback from login
- leaderboard participants are restricted to `profiles.role = 'pro'`
- leaderboard names come from a user-managed alias
- if alias is missing, the system shows an automatic fallback alias
- leaderboard ranking uses `best score all-time`
- first tiebreaker is smaller `time_used_seconds`
- if score and time are still equal, users share the same rank
- leaderboard categories are:
  - `Overall`
  - `Clinical Science`
  - `Social, Behavioral & Administrative Pharmacy`
  - `Pharmaceutical Science`
- only the top 10 rows are shown in each category

## 5. Experience Design

### Admin User Management

The admin shell should gain a new sidebar item:

- `Pengguna`

The page should contain:

1. summary cards for total users by role grouping
2. quick filters for:
   - `Semua`
   - `User aktif`
   - `Belum bayar`
   - `Admin`
3. a table or stacked list of users showing:
   - display name
   - email
   - current role
   - leaderboard alias
   - created date
4. a prominent `Tambah akun baru` action
5. per-row role change controls

The create-user action should open a lightweight form or panel with:

- email
- initial display name
- initial role

After success, the page should clearly confirm:

- account creation succeeded
- the password-setup email was sent

### Auth And Password Recovery

The login page should gain a `Lupa password?` action near the password field.

The auth flow should support:

1. request password reset by email
2. open a password set/reset page from the email link
3. save a new password
4. return the user to an expected post-auth destination

The same password set/reset page should work for:

- initial admin-created invite flow
- later forgot-password recovery flow

### Profile

The shared `/profile` page should gain a new editable field:

- `Alias leaderboard`

This field is user-managed, not admin-managed.

If it is blank:

- show helper text that an automatic fallback alias will be used in leaderboard

### Pro Leaderboard

The pro shell should gain a new sidebar item:

- `Leaderboard`

The leaderboard page should present:

- one clear title and short explanation
- a category switcher for the 4 ranking scopes
- a top-10 ranking list for the active category

Each leaderboard row should show:

- rank
- alias
- best score
- time used
- optional supporting detail such as when the score was achieved

If users are tied on both score and time:

- they display the same rank number

## 6. Data Model Direction

### Profiles

The `public.profiles` table should gain:

- `leaderboard_alias text`

Recommended meaning:

- nullable
- user-editable from `/profile`
- not required for account creation

No new role enum values should be introduced in this phase.

### Account Creation

The existing `handle_new_user` trigger remains the source that creates `profiles` rows after a new `auth.users` row is created.

The admin account-creation flow should then ensure the resulting profile has:

- email populated
- full name populated if supplied
- selected role applied

### Leaderboard Data

No leaderboard cache table is required in the first version.

The source data should come from:

- `profiles`
- `attempts`
- `attempt_results`
- `attempt_items`
- `answers`

This keeps ranking logic derived from canonical tryout data.

## 7. Backend And Query Direction

### Admin Account Creation

Based on current Supabase guidance, admin auth methods should run only in a trusted server-side environment. The admin create-user flow should therefore live in a Supabase Edge Function that:

1. verifies the caller is an authenticated admin
2. creates or invites the user using Supabase admin auth APIs
3. ensures profile fields are aligned
4. applies the selected initial role
5. triggers the password-setup email flow

The browser client must not hold service-role credentials or call privileged auth admin methods directly.

### User Listing And Role Updates

Admin user listing should be provided through SQL-backed queries that return:

- profile identity fields
- role
- leaderboard alias
- created date
- a derived admin filter label if helpful

Role updates should use a backend mutation that:

- verifies caller is admin
- validates the target role
- updates `profiles.role`
- optionally records an audit log entry if we want traceability in this phase

### Forgot Password

The login page should call Supabase password recovery APIs from the browser client.

The reset route should complete the new password save flow after the recovery or invite link has authenticated the session.

### Leaderboard Query Strategy

The leaderboard should be powered by a Postgres RPC or equivalent SQL helper rather than ranking in the browser.

Recommended API shape:

- input: leaderboard category
- output: maximum 10 ranked rows

Recommended output fields:

- `rank`
- `user_id`
- `alias`
- `score`
- `time_used_seconds`
- `attempt_id`
- `submitted_at`
- `category`

## 8. Ranking Rules

### Participant Filter

Only users with:

- `profiles.role = 'pro'`

can appear in leaderboard results.

### Alias Resolution

Displayed alias should resolve in this order:

1. `profiles.leaderboard_alias` when present and non-empty
2. an automatic fallback alias when missing

The fallback alias should avoid exposing the full real identity. A stable generated label such as `Apoteker-AB12` is preferred over full email display.

### Overall Leaderboard

For `Overall`, the system should examine submitted attempts and pick each pro user's single best all-time attempt using:

1. highest score wins
2. if tied, lower `time_used_seconds` wins
3. if still tied, users share the same rank

### Block Leaderboards

For block leaderboards, the system should not reuse the full-attempt score blindly because `attempt_results.score` reflects total session score, not per-block performance.

Instead, per-block score should be recomputed from attempt-level item and answer data for the target block:

1. count total questions from that block in the attempt
2. count correct answers in that block
3. compute score as `correct / total * 100`
4. pick each user's best all-time block score
5. use the same time-based tiebreaker
6. if still tied, assign the same rank

Only the highest-ranked 10 rows should be returned for each category.

## 9. Frontend Architecture Direction

### New Or Updated API Helpers

Recommended frontend API modules:

- extend `src/lib/api/admin-api.ts` for:
  - list managed users
  - create user through edge function
  - update role
- extend `src/lib/api/auth-api.ts` for:
  - forgot-password request
  - password reset helpers if needed
- extend `src/lib/api/profile-api.ts` for:
  - read and update `leaderboard_alias`
- add `src/lib/api/leaderboard-api.ts` for:
  - fetch leaderboard rows per category

### New Or Updated Pages

Recommended pages:

- `src/pages/admin/users-page.tsx`
- `src/pages/app/leaderboard-page.tsx`
- updated `src/pages/auth/login-page.tsx`
- a new auth password reset page
- updated `src/pages/profile-page.tsx`

### Routing And Navigation

The router should add:

- `/admin/users`
- `/app/leaderboard`
- a password reset route under the auth area

The admin and pro navigation helpers should gain corresponding sidebar items.

## 10. Validation And Error Handling

### Admin Create User

The create-user form should validate:

- email is present and valid
- role is one of the supported values
- display name may be optional or required depending on chosen UI copy, but the backend should safely handle blank names

Error states should distinguish between:

- duplicate email
- invite or email send failure
- permission failure
- generic backend failure

### Role Mutation

Role updates should:

- reject invalid roles
- show immediate success or failure feedback
- avoid forcing a full page reload if a local row update is sufficient

### Forgot Password

The forgot-password UI should:

- accept email
- confirm that a recovery email has been requested
- avoid leaking whether a user exists more than necessary in UI copy

### Leaderboard

Leaderboard should support:

- loading state
- empty state when no pro attempts qualify
- populated top-10 state
- category switching without losing current shell context

## 11. Testing Strategy

Tests should cover:

- migration adds `profiles.leaderboard_alias`
- admin create-user backend rejects non-admin callers
- admin create-user backend creates or invites the user and applies the chosen role
- role update flow only accepts valid roles
- user listing filters behave correctly for `pro`, `pendaftar_baru`, and `admin`
- login page exposes forgot-password entry point
- recovery request flow handles success and error states
- profile page reads and updates `leaderboard_alias`
- leaderboard query returns only `pro` users
- leaderboard query returns no more than 10 rows
- overall ranking honors best score then faster time
- block ranking computes per-block score correctly
- ties on score and time produce shared ranks
- pro navigation includes leaderboard and admin navigation includes pengguna

## 12. Risks And Constraints

- current app access rules still depend on both role and subscription state for `/app`, so making someone `pro` in admin does not automatically bypass the current access model unless that logic is explicitly updated later
- email invite and recovery success in production depend on Supabase email configuration, especially SMTP readiness
- the password set/reset route needs careful integration with Supabase auth redirect handling
- block-specific leaderboard math must be derived from item-level data, which is more complex than reading `attempt_results.score`
- generated alias fallback should be stable enough that users do not appear to change identity across refreshes
- the workspace currently has unrelated local changes in `supabase/.temp/cli-latest`; implementation and commits should avoid touching or reverting that file unintentionally
