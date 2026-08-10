-- Make block_id nullable
ALTER TABLE public.questions
ALTER COLUMN block_id DROP NOT NULL;

-- Drop the old constraint which was ON DELETE RESTRICT
ALTER TABLE public.questions
DROP CONSTRAINT IF EXISTS questions_block_id_fkey;

-- Add the new constraint with ON DELETE SET NULL
ALTER TABLE public.questions
ADD CONSTRAINT questions_block_id_fkey
FOREIGN KEY (block_id) REFERENCES public.blocks (id) ON DELETE SET NULL;
