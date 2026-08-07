import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StationManualEditor } from '../../../../src/features/osce/components/StationManualEditor';
import type { StationConfig } from '../../../../src/features/osce/schemas/stationConfig';
import React from 'react';

const mockConfig: StationConfig = {
  id: 'stase-1',
  title: 'Test Stase',
  type: 'komunikasi',
  durationMinutes: 8,
  instructions: 'test instructions',
  attachments: []
};

describe('StationManualEditor', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders input fields populated with config data', () => {
    const handleSave = vi.fn();
    render(<StationManualEditor initialConfig={mockConfig} onSave={handleSave} />);
    
    expect(screen.getByLabelText(/Judul Stase/i)).toHaveValue('Test Stase');
    expect(screen.getByLabelText(/Durasi \(Menit\)/i)).toHaveValue(8);
    expect(screen.getByLabelText(/Instruksi Kandidat/i)).toHaveValue('test instructions');
  });

  it('updates form fields and calls onSave with updated configuration when saved', () => {
    const handleSave = vi.fn();
    render(<StationManualEditor initialConfig={mockConfig} onSave={handleSave} />);

    const titleInput = screen.getByLabelText(/Judul Stase/i);
    const durationInput = screen.getByLabelText(/Durasi \(Menit\)/i);
    const instructionsInput = screen.getByLabelText(/Instruksi Kandidat/i);
    const saveButton = screen.getByRole('button', { name: /Simpan Konfigurasi/i });

    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    fireEvent.change(durationInput, { target: { value: '12' } });
    fireEvent.change(instructionsInput, { target: { value: 'Updated instructions content' } });

    fireEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith({
      id: 'stase-1',
      title: 'Updated Title',
      type: 'komunikasi',
      durationMinutes: 12,
      instructions: 'Updated instructions content',
      attachments: []
    });
  });

  it('handles empty or non-numeric duration gracefully when parsed', () => {
    const handleSave = vi.fn();
    render(<StationManualEditor initialConfig={mockConfig} onSave={handleSave} />);

    const durationInput = screen.getByLabelText(/Durasi \(Menit\)/i);
    const saveButton = screen.getByRole('button', { name: /Simpan Konfigurasi/i });

    fireEvent.change(durationInput, { target: { value: '' } });
    fireEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      durationMinutes: 0
    }));
  });
});
