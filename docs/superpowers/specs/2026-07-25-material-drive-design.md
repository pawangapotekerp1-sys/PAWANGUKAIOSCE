# Material Drive (Video & PPT) Design Specification

## Overview
A "Google Drive"-like feature for managing class recordings and PowerPoint presentations.
The system separates Videos and PPTs into two distinct root drives as per user request.
Global access is granted to all students, while Mentors/Admins have full CRUD, Move, and Clone capabilities.

## Architecture & Database

Two new tables will be added to the Supabase database:

1. `material_folders`
   - `id` (uuid, primary key)
   - `name` (text, folder name)
   - `parent_id` (uuid, foreign key to `material_folders.id`, nullable for root folders)
   - `drive_type` (enum/text: 'VIDEO' or 'PPT')
   - `created_by` (uuid, references `auth.users`)
   - `created_at`, `updated_at` (timestamps)
   - *Adjacency List structure enables unlimited nesting.*

2. `material_links`
   - `id` (uuid, primary key)
   - `folder_id` (uuid, foreign key to `material_folders.id`, nullable for links in root)
   - `title` (text, title of the material)
   - `url` (text, original GDrive link)
   - `embed_url` (text, parsed `/preview` link for iframe)
   - `drive_type` (enum/text: 'VIDEO' or 'PPT')
   - `created_by` (uuid, references `auth.users`)
   - `created_at`, `updated_at` (timestamps)

**Security (RLS):**
- **SELECT**: Accessible by all authenticated users (Global access).
- **INSERT/UPDATE/DELETE**: Restricted to Admin and Mentor roles only.

## UI/UX - Mentor View
- **Navigation**: New menu item "Materi & Rekaman" accessible via mentor dashboard.
- **Top Level**: Two prominent tabs: "Drive Rekaman" and "Drive PPT".
- **File Explorer Interface**:
  - Displays current path (Breadcrumbs).
  - List of folders (yellow/gray icons) and links (video/document icons).
  - **Actions**:
    - "+ Folder Baru" (Create new folder at current path).
    - "+ Tambah Link" (Add new link at current path).
    - Context Menu (⋮) on items:
      - **Rename**: Change name/title.
      - **Move**: Open a modal to select a destination folder to move the item into.
      - **Clone**: Duplicate the item (and all its children recursively if it's a folder) into the current or selected destination.
      - **Delete**: Remove item.
  - **Auto-Parsing**: When adding a link, the system automatically replaces `/view` with `/preview` for the embed URL.

## UI/UX - Student View
- **Navigation**: "Materi & Rekaman" menu item.
- **Browsing**: Students can navigate the exact same folder structure created by mentors.
- **Consumption**: Clicking a link does not open a new tab. It opens an in-app Modal or Viewer Page containing an `<iframe>` that loads the `embed_url`. This leverages GDrive's viewer settings to prevent easy downloading.

## Edge Cases & Error Handling
- Prevent cyclic dependencies when moving folders (e.g., moving a parent into its own child).
- Graceful degradation if a GDrive link is invalid or private.
- Recursive cloning must efficiently handle deep folder trees without timing out.

## Testing
- Unit tests/Integration tests for the folder Move and Clone logic (especially recursive cloning).
- RLS tests to ensure students cannot write to the drive, and only Mentors/Admins can.
