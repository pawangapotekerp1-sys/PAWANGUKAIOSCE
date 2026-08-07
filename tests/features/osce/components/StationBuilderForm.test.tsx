import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StationBuilderForm } from '../../../../src/features/osce/components/StationBuilderForm';
import React from 'react';

describe('StationBuilderForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('calls onGenerate when prompt is submitted with trimmed text', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={false} />);
    
    const textarea = screen.getByPlaceholderText(/Masukkan instruksi/i);
    fireEvent.change(textarea, { target: { value: '   Test prompt   ' } });
    
    const generateBtn = screen.getByRole('button', { name: /^Generate Skenario$/i });
    fireEvent.click(generateBtn);
    
    expect(handleGenerate).toHaveBeenCalledWith('Test prompt', undefined);
  });

  it('disables generate button when prompt is empty in prompt mode', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={false} />);
    
    const generateBtn = screen.getByRole('button', { name: /^Generate Skenario$/i });
    expect(generateBtn).toBeDisabled();
  });

  it('disables generate button when prompt contains only whitespace', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={false} />);
    
    const textarea = screen.getByPlaceholderText(/Masukkan instruksi/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    
    const generateBtn = screen.getByRole('button', { name: /^Generate Skenario$/i });
    expect(generateBtn).toBeDisabled();
  });

  it('switches to upload mode, disables submit button until file is selected, and processes selected file via input', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={false} />);
    
    const uploadTabBtn = screen.getByRole('button', { name: /Upload Dokumen/i });
    fireEvent.click(uploadTabBtn);
    
    const processBtn = screen.getByRole('button', { name: /Proses Dokumen/i });
    expect(processBtn).toBeDisabled();

    const file = new File(['sample content'], 'scenario.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText(/File terpilih: scenario.pdf/i)).toBeInTheDocument();
    expect(processBtn).not.toBeDisabled();
    
    fireEvent.click(processBtn);
    expect(handleGenerate).toHaveBeenCalledWith(undefined, file);
  });

  it('handles drag and drop file upload', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={false} />);
    
    const uploadTabBtn = screen.getByRole('button', { name: /Upload Dokumen/i });
    fireEvent.click(uploadTabBtn);
    
    const dropzone = screen.getByText(/Klik atau drop file DOCX\/PDF ke sini/i).closest('div')!;
    const file = new File(['sample content'], 'dragged.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    fireEvent.dragOver(dropzone);
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.getByText(/File terpilih: dragged.docx/i)).toBeInTheDocument();
    
    const processBtn = screen.getByRole('button', { name: /Proses Dokumen/i });
    fireEvent.click(processBtn);
    expect(handleGenerate).toHaveBeenCalledWith(undefined, file);
  });

  it('disables mode tabs, inputs, and submit button when isGenerating is true', () => {
    const handleGenerate = vi.fn();
    render(<StationBuilderForm onGenerate={handleGenerate} isGenerating={true} />);
    
    const promptTabBtn = screen.getByRole('button', { name: /AI Generator/i });
    const uploadTabBtn = screen.getByRole('button', { name: /Upload Dokumen/i });
    const textarea = screen.getByPlaceholderText(/Masukkan instruksi/i);
    const generateBtn = screen.getByRole('button', { name: /Memproses.../i });

    expect(promptTabBtn).toBeDisabled();
    expect(uploadTabBtn).toBeDisabled();
    expect(textarea).toBeDisabled();
    expect(generateBtn).toBeDisabled();
  });
});

