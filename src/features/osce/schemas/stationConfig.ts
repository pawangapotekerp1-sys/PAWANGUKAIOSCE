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

export const StationConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['komunikasi', 'dokumen', 'hybrid']),
  durationMinutes: z.number().min(1),
  instructions: z.string(),
  aiPersona: AiPersonaSchema.optional(),
  requiredForm: z.string().optional(),
  attachments: z.array(AttachmentSchema).default([]),
});

export type StationConfig = z.infer<typeof StationConfigSchema>;
