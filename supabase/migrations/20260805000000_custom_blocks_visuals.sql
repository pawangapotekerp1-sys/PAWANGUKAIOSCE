-- 1. Tambahkan kolom visual ke tabel blocks
ALTER TABLE public.blocks
ADD COLUMN icon_name text,
ADD COLUMN color_theme text;
