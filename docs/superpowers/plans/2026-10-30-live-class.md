# Live Class Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate the Live Class feature allowing mentors to manage live Zoom classes with role targeting and scheduling, and students to view schedules with dynamic Zoom meeting buttons.

**Architecture:** A shared page `/app/live-class` with mode switching (`?mode=student` vs `?mode=manage`), backed by a new Supabase table `public.live_classes` with RLS, date-aware status derivation, and integration into `StudyAreaPage` and `MentorAreaPage`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library, Tailwind CSS, Lucide React, Supabase PostgreSQL with RLS.

## Global Constraints

- Waktu pelaksanaan disimpan dalam standard ISO timestamptz dan diformat lokal Indonesia (WIB/WITA/WIT).
- Tombol Zoom pada siswa hanya aktif ketika waktu saat ini berada di antara waktu mulai dan waktu selesai (`start_time <= now <= end_time`). Di luar itu tombol disabled.
- Role target filter: Siswa role `pro` hanya melihat kelas untuk `pro` atau semua siswa. Siswa role `osce_pro` hanya melihat kelas untuk `osce_pro` atau semua siswa. Mentor dan Admin dapat melihat dan mengelola seluruhnya.
- Zero placeholder policy: Semua file dan test harus ditulis lengkap dan lulus test.

---

### Task 1: Supabase Database Migration for Live Classes

**Files:**
- Create: `supabase/migrations/20261030000000_live_classes.sql`

**Interfaces:**
- Consumes: `public.app_role` enum type (`pendaftar_baru`, `pro`, `mentor`, `admin`, `osce_pro`), `public.profiles` table.
- Produces: `public.live_classes` table with RLS policies allowing mentors/admins full CRUD and students role-targeted SELECT.

- [ ] **Step 1: Write the Supabase migration script**

Write `supabase/migrations/20261030000000_live_classes.sql`:

```sql
-- Migration: Create live_classes table with RLS and constraints

create table if loose exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  zoom_link text not null,
  target_roles public.app_role[] not null default array['pro', 'osce_pro']::public.app_role[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint check_live_class_time_order check (end_time > start_time)
);

-- Index for ordering by start_time
create index if not exists idx_live_classes_start_time on public.live_classes(start_time asc);

-- Enable Row Level Security
alter table public.live_classes enable row level security;

-- Drop existing policies if any
drop policy if exists "Mentors and admins have full access to live_classes" on public.live_classes;
drop policy if exists "Students can view live_classes targeted to their role" on public.live_classes;

-- Policy for Mentors and Admins (ALL operations)
create policy "Mentors and admins have full access to live_classes"
  on public.live_classes
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'mentor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'mentor')
    )
  );

-- Policy for Students (SELECT only matching target_roles)
create policy "Students can view live_classes targeted to their role"
  on public.live_classes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (
          profiles.role in ('admin', 'mentor')
          or profiles.role = any(live_classes.target_roles)
        )
    )
  );
```

- [ ] **Step 2: Verify migration file syntax and structure**

Run: `Test-Path "supabase/migrations/20261030000000_live_classes.sql"`
Expected: `True`

- [ ] **Step 3: Commit migration file**

```bash
git add supabase/migrations/20261030000000_live_classes.sql
git commit -m "feat(db): add live_classes table migration with rls"
```

---

### Task 2: Live Class API Client, Types, and Helper Functions

**Files:**
- Create: `src/lib/api/live-class-api.ts`
- Test: `src/lib/api/live-class-api.test.ts`

**Interfaces:**
- Consumes: `getSupabaseBrowserClient` from `src/lib/supabase/browser-client.ts`, `UserRole` from `src/lib/auth/permissions.ts`.
- Produces:
  - Types: `LiveClass`, `LiveClassStatus` ("upcoming" | "ongoing" | "ended"), `LiveClassPayload`.
  - Helpers: `computeLiveClassStatus(startTime: string, endTime: string, now?: Date): LiveClassStatus`, `formatLiveClassSchedule(startTime: string, endTime: string): string`.
  - API functions: `getLiveClasses(role?: UserRole, client?)`, `createLiveClass(payload, client?)`, `updateLiveClass(id, payload, client?)`, `deleteLiveClass(id, client?)`.

- [ ] **Step 1: Write the failing test for Live Class API & Helpers**

Write `src/lib/api/live-class-api.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import {
  computeLiveClassStatus,
  formatLiveClassSchedule,
  getLiveClasses,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
} from "./live-class-api";

describe("live-class-api helpers", () => {
  it("computes status correctly based on current time", () => {
    const start = "2026-10-30T10:00:00Z";
    const end = "2026-10-30T12:00:00Z";

    // Before start: upcoming
    expect(computeLiveClassStatus(start, end, new Date("2026-10-30T09:59:59Z"))).toBe("upcoming");
    // At start: ongoing
    expect(computeLiveClassStatus(start, end, new Date("2026-10-30T10:00:00Z"))).toBe("ongoing");
    // During session: ongoing
    expect(computeLiveClassStatus(start, end, new Date("2026-10-30T11:00:00Z"))).toBe("ongoing");
    // At end: ongoing
    expect(computeLiveClassStatus(start, end, new Date("2026-10-30T12:00:00Z"))).toBe("ongoing");
    // After end: ended
    expect(computeLiveClassStatus(start, end, new Date("2026-10-30T12:00:01Z"))).toBe("ended");
  });

  it("formats schedule into readable Indonesian string", () => {
    const formatted = formatLiveClassSchedule("2026-10-30T10:00:00Z", "2026-10-30T12:00:00Z");
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
  });
});

describe("live-class-api database queries", () => {
  it("calls select and orders by start_time asc", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "class-1",
          title: "Sesi 1",
          start_time: "2026-10-30T10:00:00Z",
          end_time: "2026-10-30T12:00:00Z",
          zoom_link: "https://zoom.us/j/123",
          target_roles: ["pro", "osce_pro"],
          created_at: "2026-10-29T10:00:00Z",
          updated_at: "2026-10-29T10:00:00Z",
        },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    const mockClient = { from };

    const result = await getLiveClasses(undefined, mockClient as never);
    expect(from).toHaveBeenCalledWith("live_classes");
    expect(select).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("start_time", { ascending: true });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Sesi 1");
  });

  it("calls insert for createLiveClass", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "new-id",
        title: "Kelas Baru",
        start_time: "2026-10-30T10:00:00Z",
        end_time: "2026-10-30T12:00:00Z",
        zoom_link: "https://zoom.us/j/123",
        target_roles: ["pro"],
        created_at: "2026-10-30T10:00:00Z",
        updated_at: "2026-10-30T10:00:00Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const mockClient = { from };

    const payload = {
      title: "Kelas Baru",
      startTime: "2026-10-30T10:00:00Z",
      endTime: "2026-10-30T12:00:00Z",
      zoomLink: "https://zoom.us/j/123",
      targetRoles: ["pro"] as ("pro" | "osce_pro")[],
    };

    const res = await createLiveClass(payload, mockClient as never);
    expect(from).toHaveBeenCalledWith("live_classes");
    expect(insert).toHaveBeenCalledWith({
      title: payload.title,
      start_time: payload.startTime,
      end_time: payload.endTime,
      zoom_link: payload.zoomLink,
      target_roles: payload.targetRoles,
    });
    expect(res.id).toBe("new-id");
  });

  it("calls update for updateLiveClass", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "edit-id",
        title: "Kelas Diedit",
        start_time: "2026-10-30T10:00:00Z",
        end_time: "2026-10-30T12:00:00Z",
        zoom_link: "https://zoom.us/j/123",
        target_roles: ["pro"],
        created_at: "2026-10-30T10:00:00Z",
        updated_at: "2026-10-30T10:00:00Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    const mockClient = { from };

    const payload = {
      title: "Kelas Diedit",
      startTime: "2026-10-30T10:00:00Z",
      endTime: "2026-10-30T12:00:00Z",
      zoomLink: "https://zoom.us/j/123",
      targetRoles: ["pro"] as ("pro" | "osce_pro")[],
    };

    const res = await updateLiveClass("edit-id", payload, mockClient as never);
    expect(from).toHaveBeenCalledWith("live_classes");
    expect(update).toHaveBeenCalledWith({
      title: payload.title,
      start_time: payload.startTime,
      end_time: payload.endTime,
      zoom_link: payload.zoomLink,
      target_roles: payload.targetRoles,
      updated_at: expect.any(String),
    });
    expect(eq).toHaveBeenCalledWith("id", "edit-id");
    expect(res.id).toBe("edit-id");
  });

  it("calls delete for deleteLiveClass", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });
    const mockClient = { from };

    await deleteLiveClass("delete-id", mockClient as never);
    expect(from).toHaveBeenCalledWith("live_classes");
    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("id", "delete-id");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/api/live-class-api.test.ts`
Expected: FAIL with "Cannot find module './live-class-api'"

- [ ] **Step 3: Write implementation for `src/lib/api/live-class-api.ts`**

Write `src/lib/api/live-class-api.ts`:

```typescript
import { getSupabaseBrowserClient } from "../supabase/browser-client";
import type { UserRole } from "../auth/permissions";

export type LiveClassStatus = "upcoming" | "ongoing" | "ended";

export type LiveClassRoleTarget = "pro" | "osce_pro";

export type LiveClass = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  zoomLink: string;
  targetRoles: LiveClassRoleTarget[];
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LiveClassPayload = {
  title: string;
  startTime: string;
  endTime: string;
  zoomLink: string;
  targetRoles: LiveClassRoleTarget[];
};

type LiveClassRow = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  zoom_link: string;
  target_roles: LiveClassRoleTarget[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export function computeLiveClassStatus(
  startTime: string,
  endTime: string,
  now: Date = new Date(),
): LiveClassStatus {
  const currentMs = now.getTime();
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();

  if (currentMs < startMs) {
    return "upcoming";
  }
  if (currentMs > endMs) {
    return "ended";
  }
  return "ongoing";
}

export function formatLiveClassSchedule(startTime: string, endTime: string): string {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const dateStr = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(startDate);

  const startTimeStr = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(startDate);

  const endTimeStr = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(endDate);

  return `${dateStr} • ${startTimeStr} - ${endTimeStr} WIB`;
}

function mapRowToLiveClass(row: LiveClassRow): LiveClass {
  return {
    id: row.id,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    zoomLink: row.zoom_link,
    targetRoles: row.target_roles ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getLiveClasses(
  role?: UserRole | null,
  client = getSupabaseBrowserClient(),
): Promise<LiveClass[]> {
  const query = client
    .from("live_classes")
    .select("*")
    .order("start_time", { ascending: true });

  const { data, error } = await query;
  if (error) {
    throw new Error(`Gagal memuat jadwal live class: ${error.message}`);
  }

  const rows = (data as LiveClassRow[]) ?? [];
  return rows.map(mapRowToLiveClass);
}

export async function createLiveClass(
  payload: LiveClassPayload,
  client = getSupabaseBrowserClient(),
): Promise<LiveClass> {
  const { data, error } = await client
    .from("live_classes")
    .insert({
      title: payload.title,
      start_time: payload.startTime,
      end_time: payload.endTime,
      zoom_link: payload.zoomLink,
      target_roles: payload.targetRoles,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal membuat jadwal live class: ${error?.message || "Data tidak ditemukan"}`);
  }

  return mapRowToLiveClass(data as LiveClassRow);
}

export async function updateLiveClass(
  id: string,
  payload: LiveClassPayload,
  client = getSupabaseBrowserClient(),
): Promise<LiveClass> {
  const { data, error } = await client
    .from("live_classes")
    .update({
      title: payload.title,
      start_time: payload.startTime,
      end_time: payload.endTime,
      zoom_link: payload.zoomLink,
      target_roles: payload.targetRoles,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal memperbarui jadwal live class: ${error?.message || "Data tidak ditemukan"}`);
  }

  return mapRowToLiveClass(data as LiveClassRow);
}

export async function deleteLiveClass(
  id: string,
  client = getSupabaseBrowserClient(),
): Promise<void> {
  const { error } = await client
    .from("live_classes")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Gagal menghapus jadwal live class: ${error.message}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/api/live-class-api.test.ts`
Expected: PASS (all 5 tests passed)

- [ ] **Step 5: Commit API layer**

```bash
git add src/lib/api/live-class-api.ts src/lib/api/live-class-api.test.ts
git commit -m "feat(api): add live-class api client and status helpers"
```

---

### Task 3: Student Live Class View Component

**Files:**
- Create: `src/components/live-class/student-live-class-view.tsx`
- Test: `src/components/live-class/student-live-class-view.test.tsx`

**Interfaces:**
- Consumes: `LiveClass`, `computeLiveClassStatus`, `formatLiveClassSchedule` from `src/lib/api/live-class-api.ts`, `Table`, `Badge`, `Button` UI primitives.
- Produces: `StudentLiveClassView` component showing a table with columns: No, Judul Sesi, Waktu Pelaksanaan, Status Badge, and Zoom Link Button (only active during ongoing session).

- [ ] **Step 1: Write failing test for `StudentLiveClassView`**

Write `src/components/live-class/student-live-class-view.test.tsx`:

```tsx
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudentLiveClassView } from "./student-live-class-view";
import type { LiveClass } from "../../lib/api/live-class-api";

describe("StudentLiveClassView", () => {
  const mockClasses: LiveClass[] = [
    {
      id: "class-ongoing",
      title: "Sesi Diskusi Farmakologi",
      startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30m ago
      endTime: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30m from now
      zoomLink: "https://zoom.us/j/ongoing123",
      targetRoles: ["pro", "osce_pro"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "class-upcoming",
      title: "Sesi Persiapan OSCE",
      startTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
      zoomLink: "https://zoom.us/j/upcoming123",
      targetRoles: ["osce_pro"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "class-ended",
      title: "Review Try Out Blok 1",
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // yesterday
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      zoomLink: "https://zoom.us/j/ended123",
      targetRoles: ["pro"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it("renders table with class list and correct action states", () => {
    render(<StudentLiveClassView classes={mockClasses} isLoading={false} />);

    expect(screen.getByText("Sesi Diskusi Farmakologi")).toBeInTheDocument();
    expect(screen.getByText("Sesi Persiapan OSCE")).toBeInTheDocument();
    expect(screen.getByText("Review Try Out Blok 1")).toBeInTheDocument();

    // Ongoing class has active button with link
    const zoomLink = screen.getByRole("link", { name: /Masuk Zoom/i });
    expect(zoomLink).toHaveAttribute("href", "https://zoom.us/j/ongoing123");
    expect(zoomLink).toHaveAttribute("target", "_blank");

    // Upcoming and Ended classes have disabled buttons
    const upcomingBtn = screen.getByRole("button", { name: /Belum Dimulai/i });
    expect(upcomingBtn).toBeDisabled();

    const endedBtn = screen.getByRole("button", { name: /Selesai/i });
    expect(endedBtn).toBeDisabled();
  });

  it("renders empty state when no classes available", () => {
    render(<StudentLiveClassView classes={[]} isLoading={false} />);
    expect(screen.getByText(/Belum ada jadwal live class/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/live-class/student-live-class-view.test.tsx`
Expected: FAIL with "Cannot find module './student-live-class-view'"

- [ ] **Step 3: Implement `StudentLiveClassView`**

Write `src/components/live-class/student-live-class-view.tsx`:

```tsx
import React, { useEffect, useState } from "react";
import { Video, ExternalLink, Calendar, Clock } from "lucide-react";
import type { LiveClass } from "../../lib/api/live-class-api";
import { computeLiveClassStatus, formatLiveClassSchedule } from "../../lib/api/live-class-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";

type StudentLiveClassViewProps = {
  classes: LiveClass[];
  isLoading?: boolean;
};

export function StudentLiveClassView({ classes, isLoading }: StudentLiveClassViewProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  // Auto-refresh interval every 30 seconds to reactively update button state
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-200 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Belum ada jadwal live class</h3>
        <p className="text-sm text-slate-500 max-w-md mt-1">
          Saat ini belum ada sesi bimbingan live yang dijadwalkan. Silakan cek kembali secara berkala.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/75">
            <TableRow>
              <TableHead className="w-14 text-center font-semibold text-slate-700">No</TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[200px]">Judul Sesi</TableHead>
              <TableHead className="font-semibold text-slate-700 min-w-[240px]">Waktu Pelaksanaan</TableHead>
              <TableHead className="font-semibold text-slate-700 w-36 text-center">Status</TableHead>
              <TableHead className="font-semibold text-slate-700 w-44 text-center">Link Zoom</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((item, index) => {
              const status = computeLiveClassStatus(item.startTime, item.endTime, now);

              return (
                <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="text-center font-medium text-slate-500">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-800">{item.title}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{formatLiveClassSchedule(item.startTime, item.endTime)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {status === "ongoing" && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse font-medium">
                        ● Sedang Berlangsung
                      </Badge>
                    )}
                    {status === "upcoming" && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                        Mendatang
                      </Badge>
                    )}
                    {status === "ended" && (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal">
                        Selesai
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {status === "ongoing" ? (
                      <a
                        href={item.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm w-full"
                      >
                        <Video className="w-4 h-4" />
                        <span>Masuk Zoom</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </a>
                    ) : status === "upcoming" ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-slate-100 cursor-not-allowed w-full"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Belum Dimulai</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed border border-slate-200 w-full"
                      >
                        <span>Selesai</span>
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/live-class/student-live-class-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit Student Live Class component**

```bash
git add src/components/live-class/student-live-class-view.tsx src/components/live-class/student-live-class-view.test.tsx
git commit -m "feat(ui): add student live class table view with dynamic action buttons"
```

---

### Task 4: Mentor Live Class View & Modal Form

**Files:**
- Create: `src/components/live-class/live-class-form-modal.tsx`
- Create: `src/components/live-class/mentor-live-class-view.tsx`
- Test: `src/components/live-class/mentor-live-class-view.test.tsx`

**Interfaces:**
- Consumes: `LiveClass`, `LiveClassPayload`, `LiveClassRoleTarget`, `createLiveClass`, `updateLiveClass`, `deleteLiveClass` from `src/lib/api/live-class-api.ts`.
- Produces: `MentorLiveClassView` component providing full management: "+ Tambah Jadwal Kelas", table with role tags, Zoom test preview, Edit modal dialog, and Delete confirm dialog.

- [ ] **Step 1: Write failing test for `MentorLiveClassView`**

Write `src/components/live-class/mentor-live-class-view.test.tsx`:

```tsx
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MentorLiveClassView } from "./mentor-live-class-view";
import type { LiveClass } from "../../lib/api/live-class-api";

describe("MentorLiveClassView", () => {
  const mockClasses: LiveClass[] = [
    {
      id: "class-1",
      title: "Bimbingan OSCE Praktik",
      startTime: "2026-11-01T10:00:00Z",
      endTime: "2026-11-01T12:00:00Z",
      zoomLink: "https://zoom.us/j/999888",
      targetRoles: ["osce_pro"],
      createdAt: "2026-10-30T10:00:00Z",
      updatedAt: "2026-10-30T10:00:00Z",
    },
  ];

  it("renders mentor table with manage controls and add button", () => {
    const onAdd = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <MentorLiveClassView
        classes={mockClasses}
        isLoading={false}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText("Bimbingan OSCE Praktik")).toBeInTheDocument();
    expect(screen.getByText("OSCE")).toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: /Tambah Jadwal/i });
    fireEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalled();

    const editBtn = screen.getByRole("button", { name: /Edit/i });
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(mockClasses[0]);

    const deleteBtn = screen.getByRole("button", { name: /Hapus/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(mockClasses[0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/live-class/mentor-live-class-view.test.tsx`
Expected: FAIL with "Cannot find module './mentor-live-class-view'"

- [ ] **Step 3: Implement `LiveClassFormModal`**

Write `src/components/live-class/live-class-form-modal.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { LiveClass, LiveClassPayload, LiveClassRoleTarget } from "../../lib/api/live-class-api";

type LiveClassFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: LiveClassPayload) => Promise<void>;
  initialData?: LiveClass | null;
  isSubmitting?: boolean;
};

function toLocalDatetimeString(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
}

export function LiveClassFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSubmitting,
}: LiveClassFormModalProps) {
  const [title, setTitle] = useState("");
  const [targetType, setTargetType] = useState<"all" | "pro" | "osce_pro">("all");
  const [startTimeLocal, setStartTimeLocal] = useState("");
  const [endTimeLocal, setEndTimeLocal] = useState("");
  const [zoomLink, setZoomLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setStartTimeLocal(toLocalDatetimeString(initialData.startTime));
      setEndTimeLocal(toLocalDatetimeString(initialData.endTime));
      setZoomLink(initialData.zoomLink);

      const roles = initialData.targetRoles || [];
      if (roles.includes("pro") && roles.includes("osce_pro")) {
        setTargetType("all");
      } else if (roles.includes("osce_pro")) {
        setTargetType("osce_pro");
      } else if (roles.includes("pro")) {
        setTargetType("pro");
      } else {
        setTargetType("all");
      }
    } else {
      setTitle("");
      setTargetType("all");
      setStartTimeLocal("");
      setEndTimeLocal("");
      setZoomLink("");
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Judul sesi wajib diisi");
      return;
    }
    if (!startTimeLocal) {
      setError("Waktu mulai wajib diisi");
      return;
    }
    if (!endTimeLocal) {
      setError("Waktu selesai wajib diisi");
      return;
    }

    const startDate = new Date(startTimeLocal);
    const endDate = new Date(endTimeLocal);

    if (endDate <= startDate) {
      setError("Waktu selesai harus setelah waktu mulai");
      return;
    }

    if (!zoomLink.trim() || (!zoomLink.startsWith("http://") && !zoomLink.startsWith("https://"))) {
      setError("Link Zoom wajib diisi dengan URL valid (diawali https:// atau http://)");
      return;
    }

    let targetRoles: LiveClassRoleTarget[] = ["pro", "osce_pro"];
    if (targetType === "pro") {
      targetRoles = ["pro"];
    } else if (targetType === "osce_pro") {
      targetRoles = ["osce_pro"];
    }

    try {
      await onSave({
        title: title.trim(),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        zoomLink: zoomLink.trim(),
        targetRoles,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Jadwal Live Class" : "Tambah Jadwal Live Class"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Judul Sesi *</Label>
            <Input
              id="title"
              placeholder="Contoh: Bimbingan OSCE Stase Farmakologi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Target Siswa *</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType("all")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  targetType === "all"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Semua Siswa
              </button>
              <button
                type="button"
                onClick={() => setTargetType("pro")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  targetType === "pro"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Apoteker (Pro)
              </button>
              <button
                type="button"
                onClick={() => setTargetType("osce_pro")}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  targetType === "osce_pro"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                OSCE Pro
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Waktu Mulai *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTimeLocal}
                onChange={(e) => setStartTimeLocal(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">Waktu Selesai *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTimeLocal}
                onChange={(e) => setEndTimeLocal(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zoomLink">Link Zoom Meeting *</Label>
            <Input
              id="zoomLink"
              type="url"
              placeholder="https://zoom.us/j/..."
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? "Menyimpan..." : "Simpan Jadwal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Implement `MentorLiveClassView`**

Write `src/components/live-class/mentor-live-class-view.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Video, ExternalLink, Calendar, Clock } from "lucide-react";
import type { LiveClass } from "../../lib/api/live-class-api";
import { computeLiveClassStatus, formatLiveClassSchedule } from "../../lib/api/live-class-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

type MentorLiveClassViewProps = {
  classes: LiveClass[];
  isLoading?: boolean;
  onAdd: () => void;
  onEdit: (liveClass: LiveClass) => void;
  onDelete: (liveClass: LiveClass) => void;
};

export function MentorLiveClassView({
  classes,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: MentorLiveClassViewProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const renderRoleBadge = (roles: string[]) => {
    if (roles.includes("pro") && roles.includes("osce_pro")) {
      return <Badge variant="outline" className="text-slate-700 border-slate-300">Semua Siswa</Badge>;
    }
    if (roles.includes("osce_pro")) {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200">OSCE</Badge>;
    }
    if (roles.includes("pro")) {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Apoteker</Badge>;
    }
    return <Badge variant="outline">Semua Siswa</Badge>;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Live Class</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola jadwal webinar Zoom, target peserta, dan waktu pelaksanaan kelas.
          </p>
        </div>
        <Button
          onClick={onAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jadwal Kelas</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-200 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Belum ada kelas yang dibuat</h3>
          <p className="text-sm text-slate-500 max-w-md mt-1 mb-4">
            Mulai jadwalkan sesi tatap muka online pertama untuk siswa dengan klik tombol di bawah.
          </p>
          <Button onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Jadwal Kelas
          </Button>
        </div>
      ) : (
        <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/75">
                <TableRow>
                  <TableHead className="w-12 text-center font-semibold text-slate-700">No</TableHead>
                  <TableHead className="font-semibold text-slate-700 min-w-[200px]">Judul Sesi</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-32 text-center">Target Siswa</TableHead>
                  <TableHead className="font-semibold text-slate-700 min-w-[220px]">Waktu Pelaksanaan</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-36 text-center">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-32 text-center">Zoom Link</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-28 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((item, index) => {
                  const status = computeLiveClassStatus(item.startTime, item.endTime, now);

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-center font-medium text-slate-500">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{item.title}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        {renderRoleBadge(item.targetRoles)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{formatLiveClassSchedule(item.startTime, item.endTime)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {status === "ongoing" && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse font-medium">
                            ● Berlangsung
                          </Badge>
                        )}
                        {status === "upcoming" && (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                            Mendatang
                          </Badge>
                        )}
                        {status === "ended" && (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal">
                            Selesai
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <a
                          href={item.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Buka Zoom</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            title="Edit Jadwal"
                            className="h-8 w-8 text-slate-600 hover:text-slate-900"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item)}
                            title="Hapus Jadwal"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Hapus</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run src/components/live-class/mentor-live-class-view.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit Mentor Live Class components**

```bash
git add src/components/live-class/live-class-form-modal.tsx src/components/live-class/mentor-live-class-view.tsx src/components/live-class/mentor-live-class-view.test.tsx
git commit -m "feat(ui): add mentor live class view and modal dialog for class scheduling"
```

---

### Task 5: LiveClassPage, Route Integration, and Hub Cards

**Files:**
- Create: `src/pages/app/live-class-page.tsx`
- Test: `src/pages/app/live-class-page.test.tsx`
- Modify: `src/pages/app/study-area-page.tsx`
- Modify: `src/pages/app/mentor-area-page.tsx`
- Modify: `src/router/app-router.tsx`
- Modify: `src/mocks/student-dashboard.ts`

**Interfaces:**
- Consumes: `StudentLiveClassView`, `MentorLiveClassView`, `LiveClassFormModal`, `getLiveClasses`, `createLiveClass`, `updateLiveClass`, `deleteLiveClass`, `ConfirmDialog`, `useStudentShell`.
- Produces: Integrated page `/app/live-class` with accessible cards on `/app/area-belajar` and `/app/area-mentor`.

- [ ] **Step 1: Write tests for `LiveClassPage`**

Write `src/pages/app/live-class-page.test.tsx`:

```tsx
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LiveClassPage from "./live-class-page";
import * as liveClassApi from "../../lib/api/live-class-api";

vi.mock("./use-student-shell", () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: "Student Plan",
    role: "student",
  }),
}));

vi.mock("../../lib/auth/use-session", () => ({
  useSession: () => ({
    status: "authenticated",
    user: { id: "student-1", email: "student@example.com" },
  }),
}));

describe("LiveClassPage", () => {
  beforeEach(() => {
    vi.spyOn(liveClassApi, "getLiveClasses").mockResolvedValue([
      {
        id: "class-1",
        title: "Webinar Pembahasan Try Out",
        startTime: "2026-10-30T10:00:00Z",
        endTime: "2026-10-30T12:00:00Z",
        zoomLink: "https://zoom.us/j/123",
        targetRoles: ["pro", "osce_pro"],
        createdAt: "2026-10-29T10:00:00Z",
        updatedAt: "2026-10-29T10:00:00Z",
      },
    ]);
  });

  it("renders student view when mode=student", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app/live-class?mode=student"]}>
          <LiveClassPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Webinar Pembahasan Try Out")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `LiveClassPage` in `src/pages/app/live-class-page.tsx`**

Write `src/pages/app/live-class-page.tsx`:

```tsx
import React, { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProductShell from "../../components/layout/product-shell";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import {
  getLiveClasses,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
  type LiveClass,
  type LiveClassPayload,
} from "../../lib/api/live-class-api";
import { StudentLiveClassView } from "../../components/live-class/student-live-class-view";
import { MentorLiveClassView } from "../../components/live-class/mentor-live-class-view";
import { LiveClassFormModal } from "../../components/live-class/live-class-form-modal";
import ConfirmDialog from "../../components/ui/confirm-dialog";

export default function LiveClassPage() {
  const [searchParams] = useSearchParams();
  const currentHref = "/app/live-class";
  const studentShell = useStudentShell(currentHref);
  const queryClient = useQueryClient();

  const isStudentMode = searchParams.get("mode") === "student";
  const isMentorOrAdmin = !isStudentMode && (studentShell.role === "mentor" || studentShell.role === "admin");

  // State for Mentor Modal Form & Confirm Dialog
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LiveClass | null>(null);
  const [deletingItem, setDeletingItem] = useState<LiveClass | null>(null);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["live-classes", studentShell.role],
    queryFn: () => getLiveClasses(studentShell.role),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: LiveClassPayload) => {
      if (editingItem) {
        return updateLiveClass(editingItem.id, payload);
      }
      return createLiveClass(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
      setIsModalOpen(false);
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteLiveClass(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-classes"] });
      setDeletingItem(null);
    },
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: LiveClass) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingItem) {
      await deleteMutation.mutateAsync(deletingItem.id);
    }
  };

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-6 w-full py-4">
        {isMentorOrAdmin ? (
          <MentorLiveClassView
            classes={classes}
            isLoading={isLoading}
            onAdd={handleOpenAdd}
            onEdit={handleOpenEdit}
            onDelete={(item) => setDeletingItem(item)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Jadwal Live Class</h1>
              <p className="text-sm text-slate-500 mt-1">
                Jadwal sesi kelas online tatap muka interaktif bersama mentor via Zoom.
              </p>
            </div>
            <StudentLiveClassView classes={classes} isLoading={isLoading} />
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit */}
      {isMentorOrAdmin && (
        <LiveClassFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSave={async (payload) => {
            await saveMutation.mutateAsync(payload);
          }}
          initialData={editingItem}
          isSubmitting={saveMutation.isPending}
        />
      )}

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        title="Hapus Jadwal Live Class"
        message={`Apakah Anda yakin ingin menghapus jadwal "${deletingItem?.title}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={deleteMutation.isPending ? "Menghapus..." : "Hapus Jadwal"}
        cancelLabel="Batal"
        tone="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </ProductShell>
  );
}
```

- [ ] **Step 3: Modify `src/pages/app/study-area-page.tsx` to add Live Class card**

Add `Radio` icon and `live-class` entry to `STUDY_FEATURES`:

```tsx
// in STUDY_FEATURES array:
  {
    id: "live-class",
    title: "Live Class",
    description: "Ikuti bimbingan online tatap muka interaktif bersama mentor via Zoom sesuai jadwal kelas.",
    href: "/app/live-class?mode=student",
    buttonText: "Pilih Live Class",
    icon: Radio,
  },
```

- [ ] **Step 4: Modify `src/pages/app/mentor-area-page.tsx` to add Kelola Live Class card**

Add `Radio` icon and `kelola-live-class` entry to `MENTOR_FEATURES`:

```tsx
// in MENTOR_FEATURES array:
  {
    id: "kelola-live-class",
    title: "Kelola Live Class",
    description: "Atur jadwal kelas tatap muka online, tautan Zoom, waktu pelaksanaan, dan target peserta.",
    href: "/app/live-class?mode=manage",
    buttonText: "Pilih Kelola Live Class",
    icon: Radio,
  },
```

- [ ] **Step 5: Modify `src/router/app-router.tsx` to add route**

Add lazy import:
```tsx
const LiveClassPage = lazy(() => import("../pages/app/live-class-page"));
```
And add Route under `<Route element={<AppRouteGuard />}>`:
```tsx
<Route path="live-class" element={<LiveClassPage />} />
```

- [ ] **Step 6: Update `src/mocks/student-dashboard.ts` active tab matcher**

In `createProductNavItems`:
```tsx
if (item.href === "/app/area-belajar" && (activeHref.startsWith("/app/area-belajar") || activeHref.startsWith("/app/live-class") || activeHref === "/app/rekaman-kelas" || activeHref === "/app/materi-ppt" || activeHref.startsWith("/app/flash-cards") || activeHref.startsWith("/app/osce-demo"))) {
  isActive = true;
}
```

- [ ] **Step 7: Run test to verify all tests pass**

Run: `npm test -- --run src/pages/app/live-class-page.test.tsx`
Run: `npm test -- --run src/pages/app/study-area-page.test.tsx`
Expected: ALL PASS

- [ ] **Step 8: Run type-check**

Run: `npm run type-check` or `npx tsc -p tsconfig.app.json --noEmit`
Expected: 0 errors

- [ ] **Step 9: Commit final integration**

```bash
git add src/pages/app/live-class-page.tsx src/pages/app/live-class-page.test.tsx src/pages/app/study-area-page.tsx src/pages/app/mentor-area-page.tsx src/router/app-router.tsx src/mocks/student-dashboard.ts
git commit -m "feat(live-class): integrate live class page, routes, and hub feature cards"
```
