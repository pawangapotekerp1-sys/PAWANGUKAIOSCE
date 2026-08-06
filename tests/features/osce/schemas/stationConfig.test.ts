import { describe, it, expect } from 'vitest';
import { StationConfigSchema } from '../../../../src/features/osce/schemas/stationConfig';

describe('StationConfigSchema', () => {
  it('validates a correct communication station config', () => {
    const validConfig = {
      id: 'stase-1',
      title: 'Konseling Hipertensi',
      type: 'komunikasi',
      durationMinutes: 8,
      instructions: 'Lakukan konseling kepada pasien.',
      aiPersona: { role: 'patient', prompt: 'You are an angry patient.' },
      attachments: [{ id: 'resep1', title: 'Resep Dokter', type: 'image', url: '/resep.jpg' }]
    };
    
    const result = StationConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('rejects invalid config', () => {
    const invalidConfig = { id: 'stase-1' };
    const result = StationConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });
});
