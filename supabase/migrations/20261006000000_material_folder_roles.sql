
-- Add visible_to array to material_folders and material_links
ALTER TABLE public.material_folders ADD COLUMN visible_to public.app_role[] DEFAULT array['pro', 'osce_pro']::public.app_role[];
ALTER TABLE public.material_links ADD COLUMN visible_to public.app_role[] DEFAULT array['pro', 'osce_pro']::public.app_role[];
