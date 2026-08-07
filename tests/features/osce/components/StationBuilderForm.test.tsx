import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StationBuilderForm } from '../../../../src/features/osce/components/StationBuilderForm';
import React from 'react';

describe('StationBuilderForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('calls onGenerate when prompt is submitted', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={false} />);
    
    const textarea = screen.getByPlaceholderText(/Masukkan instruksi/i);
    fireEvent.change(textarea, { target: { value: 'Test prompt' } });
    
    const generateBtn = screen.getByRole('button', { name: /^Generate Skenario$/i });
    fireEvent.click(generateBtn);
    
    expect(handleGenerate).toHaveBeenCalledWith('Test prompt', undefined);
  });

  it('switches to upload mode and calls onGenerate when document processing is submitted', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={false} />);
    
    const uploadTabBtn = screen.getByRole('button', { name: /Upload Dokumen/i });
    fireEvent.click(uploadTabBtn);
    
    const processBtn = screen.getByRole('button', { name: /Proses Dokumen/i });
    fireEvent.click(processBtn);
    
    expect(handleGenerate).toHaveBeenCalledWith(undefined, expect.any(File));
  });

  it('disables generate button when prompt is empty in prompt mode', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={false} />);
    
    const generateBtn = screen.getByRole('button', { name: /^Generate Skenario$/i });
    expect(generateBtn).toBeDisabled();
  });

  it('shows loading state when isGenerating is true', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={true} />);
    
    expect(screen.getByText(/Memproses.../i)).toBeInTheDocument();
  });
});
