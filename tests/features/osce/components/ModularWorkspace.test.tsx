import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ModularWorkspace } from '../../../../src/features/osce/components/ModularWorkspace';
import type { StationConfig } from '../../../../src/features/osce/schemas/stationConfig';
import React from 'react';

describe('ModularWorkspace', () => {
  afterEach(() => {
    cleanup();
  });

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

  it('renders both Voice UI and Form UI for hybrid type', () => {
    const config: StationConfig = {
      id: '3', title: 'Test Hybrid', type: 'hybrid', durationMinutes: 10, instructions: 'test hybrid', requiredForm: 'sp', attachments: []
    };
    render(<ModularWorkspace config={config} />);
    expect(screen.getByText('AI Voice Roleplay (Mock)')).toBeInTheDocument();
    expect(screen.getByText('Interactive Form (Mock)')).toBeInTheDocument();
  });
});
