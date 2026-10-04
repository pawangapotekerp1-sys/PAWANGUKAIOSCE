# Scheduled Tryout Manager Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merombak fitur manajer try out terjadwal menjadi dua alur terpisah: modal konfigurasi (metadata) di halaman tabel dan halaman kelola soal khusus.

**Architecture:** Menerapkan field konfigurasi dinamis ke dalam database dan memisahkan antarmuka pengguna agar lebih modular (tabel + modal terpisah dari halaman kelola soal).

**Tech Stack:** React, TypeScript, Supabase, Tailwind CSS, Lucide React

## Global Constraints

- Tampilan layout dan struktur informasi harus mengikuti mockup, namun *styling* (tone warna, font, shadows, dll) harus diadaptasikan dengan sistem *design* atau UI yang sudah ada di aplikasi ini agar selaras.
- Database migrations menggunakan skrip SQL yang dieksekusi melalui Supabase CLI atau Migration Tool.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20261004000000_scheduled_tryout_manager_redesign.sql`

**Interfaces:**
- Consumes: Skema tabel `scheduled_tryout_events` lama.
- Produces: Kolom baru `total_questions`, `duration_minutes`, `max_attempts` di tabel `scheduled_tryout_events` dan `upsert_scheduled_tryout_event` yang disesuaikan.

- [ ] **Step 1: Write migration SQL**

```sql
alter table public.scheduled_tryout_events
add column total_questions integer not null default 100,
add column duration_minutes integer not null default 100,
add column max_attempts integer not null default 1;

create or replace function public.upsert_scheduled_tryout_event(
  target_event_id uuid,
  payload jsonb
)
returns public.scheduled_tryout_events
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_event public.scheduled_tryout_events%rowtype;
  incoming_existing_question_ids uuid[] := '{}'::uuid[];
  question_payload jsonb;
  current_question_id uuid;
  current_block_id uuid;
  current_topic_id uuid;
  next_question_order integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu sebelum menyimpan event try out terjadwal.'
      using errcode = '42501';
  end if;

  if not public.can_manage_scheduled_tryouts() then
    raise exception 'Akses kelola event try out terjadwal hanya tersedia untuk mentor atau admin.'
      using errcode = '42501';
  end if;

  if payload is null then
    raise exception 'Payload event try out terjadwal tidak boleh kosong.'
      using errcode = 'P0001';
  end if;

  if target_event_id is null then
    insert into public.scheduled_tryout_events (
      title,
      description,
      editorial_status,
      access_start_at,
      access_end_at,
      created_by,
      updated_by,
      total_questions,
      duration_minutes,
      max_attempts
    )
    values (
      payload->>'title',
      coalesce(payload->>'description', ''),
      payload->>'editorialStatus',
      (payload->>'accessStartAt')::timestamptz,
      (payload->>'accessEndAt')::timestamptz,
      nullif(payload->>'createdBy', '')::uuid,
      coalesce(nullif(payload->>'updatedBy', '')::uuid, nullif(payload->>'createdBy', '')::uuid),
      coalesce((payload->>'totalQuestions')::integer, 100),
      coalesce((payload->>'durationMinutes')::integer, 100),
      coalesce((payload->>'maxAttempts')::integer, 1)
    )
    returning *
    into saved_event;
  else
    update public.scheduled_tryout_events
    set
      title = payload->>'title',
      description = coalesce(payload->>'description', ''),
      editorial_status = payload->>'editorialStatus',
      access_start_at = (payload->>'accessStartAt')::timestamptz,
      access_end_at = (payload->>'accessEndAt')::timestamptz,
      updated_by = nullif(payload->>'updatedBy', '')::uuid,
      total_questions = coalesce((payload->>'totalQuestions')::integer, 100),
      duration_minutes = coalesce((payload->>'durationMinutes')::integer, 100),
      max_attempts = coalesce((payload->>'maxAttempts')::integer, 1)
    where id = target_event_id
    returning *
    into saved_event;

    if not found then
      raise exception 'Event try out terjadwal tidak ditemukan.'
        using errcode = 'P0002';
    end if;
  end if;

  -- Jika payload tidak mengandung field 'questions', berarti upsert hanya untuk metadata. Skip logika questions.
  if payload ? 'questions' then
    select coalesce(array_agg(nullif(question_item->>'id', '')::uuid), '{}'::uuid[])
    into incoming_existing_question_ids
    from jsonb_array_elements(coalesce(payload->'questions', '[]'::jsonb)) as question(question_item)
    where nullif(question_item->>'id', '') is not null;

    delete from public.scheduled_tryout_event_questions
    where event_id = saved_event.id
      and not (id = any(incoming_existing_question_ids));

    for question_payload in
      select value
      from jsonb_array_elements(coalesce(payload->'questions', '[]'::jsonb))
    loop
      next_question_order := next_question_order + 1;
      current_question_id := nullif(question_payload->>'id', '')::uuid;
      current_block_id := nullif(question_payload->>'blockId', '')::uuid;
      current_topic_id := nullif(question_payload->>'topicId', '')::uuid;

      if current_question_id is null then
        insert into public.scheduled_tryout_event_questions (
          event_id,
          question_order,
          stem,
          question_image_path,
          block_id,
          topic_id,
          correct_option_key,
          explanation_text,
          explanation_image_path
        )
        values (
          saved_event.id,
          next_question_order,
          question_payload->>'stem',
          nullif(question_payload->>'questionImagePath', ''),
          current_block_id,
          current_topic_id,
          question_payload->>'correctOptionKey',
          nullif(question_payload->>'explanationText', ''),
          nullif(question_payload->>'explanationImagePath', '')
        )
        returning id
        into current_question_id;
      else
        update public.scheduled_tryout_event_questions
        set
          question_order = next_question_order,
          stem = question_payload->>'stem',
          question_image_path = nullif(question_payload->>'questionImagePath', ''),
          block_id = current_block_id,
          topic_id = current_topic_id,
          correct_option_key = question_payload->>'correctOptionKey',
          explanation_text = nullif(question_payload->>'explanationText', ''),
          explanation_image_path = nullif(question_payload->>'explanationImagePath', '')
        where id = current_question_id
          and event_id = saved_event.id
        returning id
        into current_question_id;

        if not found then
          raise exception 'Soal event try out terjadwal tidak ditemukan.'
            using errcode = 'P0002';
        end if;
      end if;

      delete from public.scheduled_tryout_event_question_options
      where event_question_id = current_question_id;

      insert into public.scheduled_tryout_event_question_options (
        event_question_id,
        option_key,
        option_text,
        sort_order
      )
      select
        current_question_id,
        option_payload->>'key',
        option_payload->>'text',
        ordinality
      from jsonb_array_elements(coalesce(question_payload->'options', '[]'::jsonb)) with ordinality as option(option_payload, ordinality);
    end loop;
  end if;

  return saved_event;
end;
$$;

revoke all on function public.upsert_scheduled_tryout_event(uuid, jsonb) from public, anon;
grant execute on function public.upsert_scheduled_tryout_event(uuid, jsonb) to authenticated;
grant execute on function public.upsert_scheduled_tryout_event(uuid, jsonb) to service_role;
```

- [ ] **Step 2: Apply migration to local dev db (optional if CLI available)**
Execute the migration using the local Supabase environment or provide instructions. (Using `npm run db:reset` or `supabase db push` etc based on project setup).

---
### Task 2: Update API logic

**Files:**
- Modify: `src/lib/api/scheduled-tryout-api.ts`
- Modify: `src/lib/mappers/scheduled-tryout-mappers.ts` (if applicable)

**Interfaces:**
- Consumes: Skema tabel baru.
- Produces: API methods yang mendukung metadata dinamis.

- [ ] **Step 1: Update API type definitions**
Di `src/lib/api/scheduled-tryout-api.ts`:
Tambahkan properti baru di `ScheduledEventRow`:
```typescript
type ScheduledEventRow = {
  id: string;
  title: string;
  description: string;
  editorial_status: "draft" | "published";
  access_start_at: string;
  access_end_at: string;
  current_cycle: number;
  total_questions: number;
  duration_minutes: number;
  max_attempts: number;
  updated_at?: string | null;
};
```
Ubah `ScheduledEventMutationInput`:
```typescript
export type ScheduledEventMutationInput = {
  title: string;
  description: string;
  editorialStatus: "draft" | "published";
  accessStartAt: string;
  accessEndAt: string;
  totalQuestions: number;
  durationMinutes: number;
  maxAttempts: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  questions?: ScheduledEventQuestionDraftInput[];
};
```

- [ ] **Step 2: Update mapper functions & read lists**
Di `src/lib/api/scheduled-tryout-api.ts`:
Dalam fungsi `listScheduledOpsEvents`, ambil field baru.
Ubah pemanggilan select menjadi: `.select("id, title, description, editorial_status, access_start_at, access_end_at, current_cycle, total_questions, duration_minutes, max_attempts")`
Lalu di bagian mapping `rows: ScheduledOpsEvent[] = eventRows.map((event) => { ... }`:
```typescript
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      editorialStatus: event.editorial_status,
      accessStartAt: event.access_start_at,
      accessEndAt: event.access_end_at,
      currentCycle: event.current_cycle,
      questionCount: event.total_questions,
      durationMinutes: event.duration_minutes,
      maxAttempts: event.max_attempts,
    };
```
(Asumsikan `ScheduledOpsEvent` di mappers/ juga diubah untuk menerima maxAttempts jika perlu, dan durasi tidak lagi menggunakan `questionCount`).

Di `listScheduledTryoutCatalogEntries`:
```typescript
    return {
      // ...
      questionCount: event.total_questions,
      durationMinutes: event.duration_minutes,
      remainingAttempts: Math.max(0, event.max_attempts - submittedAttemptCount),
      // ...
    };
```

- [ ] **Step 3: Update mapper file**
Di `src/lib/mappers/scheduled-tryout-mappers.ts`, pastikan type `ScheduledOpsEvent` memiliki type yang sesuai:
```typescript
export type ScheduledOpsEvent = {
  id: string;
  title: string;
  description: string;
  editorialStatus: "draft" | "published";
  accessStartAt: string;
  accessEndAt: string;
  currentCycle: number;
  questionCount: number;
  durationMinutes: number;
  maxAttempts?: number;
};
```

---
### Task 3: Redesign Table Page & Create Modal

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-events-page.tsx`

**Interfaces:**
- Consumes: Data dari `eventsQuery` (API).
- Produces: Komponen tabel lengkap dengan integrasi tombol Edit dan Hapus, serta form pop-up modal.

- [ ] **Step 1: Replace implementation of `ScheduledEventsPage`**
Implementasikan desain tabel dengan Tailwind. Pastikan tidak ada *landing cards* (Pemilihan Fitur) lagi.

```tsx
// Isi scheduled-events-page.tsx sepenuhnya. (Potongan ringkas, agen harap lengkapi sesuai desain UI yang ditugaskan).
import { useState } from "react";
// ... (imports)

// Implementasi modal dialog state
// Tambahkan <Dialog> atau state modal lokal untuk form "Tambah / Edit" Tryout.

// Render the main table using standard Tailwind styles that match the app's design language.
// Include the modal logic that calls createScheduledEvent or updateScheduledEvent.
```
> *Catatan untuk Agen Eksekutor:* Ikuti referensi Gambar 1 untuk layout tabel, dan Gambar 2,3,5 untuk modal. Jangan sekadar menempel kode ini, pastikan mengimplementasikan state `isModalOpen`, form submission, `createMutation`, dan `updateMutation`. Gunakan `alert` atau toast untuk success/error.

---
### Task 4: Refactor Question Manager Page

**Files:**
- Modify: `src/pages/scheduled-ops/scheduled-event-editor-page.tsx` -> Ubah namanya menjadi `scheduled-event-questions-page.tsx` atau refaktor fungsionalitasnya.
- Modify: `src/router/app-router.tsx` (sesuaikan rute jika di-rename).

**Interfaces:**
- Consumes: `eventId` dari URL param.
- Produces: UI kelola soal khusus untuk event terkait (tanpa setting form metadata di atasnya).

- [ ] **Step 1: Strip out metadata form from editor**
Di `scheduled-event-editor-page.tsx`:
Hapus bagian "Atur event", form `Judul event`, `Status tayang`, `Jadwal akses`.
Sisakan HANYA form pembuatan soal dan tombol Save soal (yang memanggil API persist pertanyaan).

- [ ] **Step 2: Update UI to match "Kelola Soal" screen**
Sesuaikan layout agar daftar navigasi soal ada di sebelah kiri/atas, dan editor pertanyaannya terfokus. Gunakan referensi layout dari app, adaptasi stylingnya.

---
### Self-Review and Subagent Handoff

Plan sudah mencakup semua komponen dari migrasi database hingga frontend refactoring.
