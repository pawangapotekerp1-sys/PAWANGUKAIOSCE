import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ModularWorkspace } from '../../../../src/features/osce/components/ModularWorkspace';
import type { StationConfig } from '../../../../src/features/osce/schemas/stationConfig';
import React from 'react';

describe('ModularWorkspace', () => {
  it('renders Voice UI for komunikasi type', () => {
    const config: StationConfig = {
      id: '1', title: 'Test', type: 'komunikasi', durationMinutes: 8, instructions: 'test', attachments: []
    };
    render(<ModularWorkspace config={config} />);
    expect(screen.getByText('AI Voice Roleplay (Mock)')).toBeInTheDocument();
  });

  it('renders Form UI for dokumen type', () => {
    const config: StationConfig = {
      id: '2', title: 'Test', type: 'dokumen', durationMinutes: 8, instructions: 'test', requiredForm: 'sp', attachments: []
    };
    render(<ModularWorkspace config={config} />);
    expect(screen.getByText('Interactive Form (Mock)')).toBeInTheDocument();
  });
});
