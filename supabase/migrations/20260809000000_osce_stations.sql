CREATE TABLE public.osce_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('komunikasi', 'dokumen', 'hybrid')),
    duration_minutes INTEGER NOT NULL,
    objective TEXT,
    instructions TEXT NOT NULL,
    actor_instructions TEXT,
    rubrics JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.osce_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view osce stations" 
ON public.osce_stations FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert osce stations" 
ON public.osce_stations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own osce stations" 
ON public.osce_stations FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own osce stations" 
ON public.osce_stations FOR DELETE 
TO authenticated 
USING (auth.uid() = created_by OR public.is_admin());
