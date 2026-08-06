import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OsceShell } from '../../../../src/features/osce/components/OsceShell';
import type { StationConfig } from '../../../../src/features/osce/schemas/stationConfig';
import React from 'react';

const mockConfig: StationConfig = {
  id: 'stase-1',
  title: 'Konseling Hipertensi',
  type: 'komunikasi',
  durationMinutes: 8,
  instructions: 'Lakukan konseling',
  attachments: []
};

describe('OsceShell', () => {
  it('renders title and instructions', () => {
    render(<OsceShell config={mockConfig}><div>Child Content</div></OsceShell>);
    expect(screen.getByText('Konseling Hipertensi')).toBeInTheDocument();
    expect(screen.getByText('Lakukan konseling')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });
});
