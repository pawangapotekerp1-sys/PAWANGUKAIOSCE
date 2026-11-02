-- Migration: Add belum_bayar to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'belum_bayar';
