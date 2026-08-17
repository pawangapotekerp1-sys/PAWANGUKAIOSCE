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
  rubricId: z.string().optional(),
  competencyDomain: z.string(),
  criterion: z.string().optional(),
  description: z.string().optional(),
  expectedEvidence: z.string().optional(),
  criticalElements: z.array(z.string()).optional(),
  supportingElements: z.array(z.string()).optional(),
  acceptedSemanticVariants: z.array(z.string()).optional(),
  acceptedClinicalAlternatives: z.array(z.string()).optional(),
  unacceptableResponses: z.array(z.string()).optional(),
  dangerousResponses: z.array(z.string()).optional(),
  score3Anchor: z.string().optional(),
  score2Anchor: z.string().optional(),
  score1Anchor: z.string().optional(),
  score0Anchor: z.string().optional(),
  weight: z.number().optional(),
  isCriticalItem: z.boolean().optional(),
  criticalErrorRule: z.string().optional(),
  patientSafetyRule: z.string().optional(),
  sequenceSensitive: z.boolean().optional(),
  conditionalRule: z.string().optional(),
  evidenceSource: z.string().optional(),
  reference: z.string().optional(),
  referenceVersion: z.string().optional(),
  humanReviewTrigger: z.string().optional(),
  
  // Keep legacy fields for backward compatibility during transition
  competency: z.string().optional(),
  score3: z.string().optional(),
  score2: z.string().optional(),
  score1: z.string().optional(),
  score0: z.string().optional(),
});

export const StationConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['komunikasi', 'dokumen', 'hybrid']),
  durationMinutes: z.number().min(1),
  objective: z.string().optional(),
  competence: z.string().optional(),
  practiceArea: z.string().optional(),
  instructions: z.string(),
  reference: z.string().optional(),
  actorInstructions: z.string().optional(),
  actorGender: z.enum(['male', 'female']).optional(),
  rubrics: z.array(RubricSchema).optional(),
  aiPersona: AiPersonaSchema.optional(),
  requiredForm: z.string().optional(),
  worksheetTemplate: z.string().optional(),
  attachments: z.array(AttachmentSchema).default([]),
});

export type StationConfig = z.infer<typeof StationConfigSchema>;
