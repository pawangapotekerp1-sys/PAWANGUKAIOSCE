import { describe, expect, test } from "vitest";
import { resolveSupabaseSource } from "./source";

describe("resolveSupabaseSource", () => {
  test("classifies localhost URLs as local Supabase with a cloud warning", () => {
    expect(resolveSupabaseSource("http://127.0.0.1:54321")).toEqual({
      kind: "local",
      label: "Supabase Local",
      host: "127.0.0.1:54321",
      note: "Perubahan di Supabase cloud tidak akan muncul di app ini.",
    });
  });

  test("classifies hosted URLs as cloud Supabase with the active project host", () => {
    expect(resolveSupabaseSource("https://koapcujyfcjmtdovmxoe.supabase.co")).toEqual({
      kind: "cloud",
      label: "Supabase Cloud",
      host: "koapcujyfcjmtdovmxoe.supabase.co",
      note: "App ini membaca project cloud yang sedang aktif.",
    });
  });

  test("returns null when the source URL is missing", () => {
    expect(resolveSupabaseSource("")).toBeNull();
    expect(resolveSupabaseSource(undefined)).toBeNull();
  });
});
