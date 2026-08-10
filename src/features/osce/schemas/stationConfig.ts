import { z } from 'zod';

export const AttachmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['image', 'pdf']),
  url: z.string(),
});

export const AiPersonaSchema = z.object({
  role: z.enum(['patient', 'doctor', 'nurse']),
  prompt: z.string(),
});

export const RubricSchema = z.object({
  competency: z.string(),
  score3: z.string(),
  score2: z.string(),
  score1: z.string(),
  score0: z.string(),
});

export const StationConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['komunikasi', 'dokumen', 'hybrid']),
  durationMinutes: z.number().min(1),
  objective: z.string().optional(),
  instructions: z.string(),
  actorInstructions: z.string().optional(),
  rubrics: z.array(RubricSchema).optional(),
  aiPersona: AiPersonaSchema.optional(),
  requiredForm: z.string().optional(),
  attachments: z.array(AttachmentSchema).default([]),
});

export type StationConfig = z.infer<typeof StationConfigSchema>;
