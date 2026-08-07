import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import OsceBuilderPage from '../../../src/pages/app/osce-builder-page';
import React from 'react';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../src/pages/app/use-student-shell', () => ({
  useStudentShell: () => ({
    navItems: [],
    tierLabel: 'PRO MENTOR',
    role: 'mentor',
  }),
}));

describe('OsceBuilderPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockNavigate.mockReset();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders StationBuilderForm initially in build mode', () => {
    render(
      <MemoryRouter>
        <OsceBuilderPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Pilih Metode Pembuatan/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Masukkan instruksi skenario OSCE/i)).toBeInTheDocument();
  });

  it('handles AI scenario generation workflow (build -> generating -> edit)', async () => {
    render(
      <MemoryRouter>
        <OsceBuilderPage />
      </MemoryRouter>
    );

    const textarea = screen.getByPlaceholderText(/Masukkan instruksi skenario OSCE/i);
    fireEvent.change(textarea, { target: { value: 'Pasien datang dengan keluhan batuk' } });

    const generateBtn = screen.getByRole('button', { name: /^Generate Skenario$/i });
    fireEvent.click(generateBtn);

    expect(screen.getByRole('button', { name: /Memproses.../i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText(/Editor Manual \(Draft\)/i)).toBeInTheDocument();
    const titleInput = screen.getByLabelText(/Judul Stase/i) as HTMLInputElement;
    expect(titleInput.value).toContain('Pasien datang dengan keluhan batuk');
  });

  it('handles document upload scenario generation workflow', async () => {
    render(
      <MemoryRouter>
        <OsceBuilderPage />
      </MemoryRouter>
    );

    const uploadTab = screen.getByRole('button', { name: /Upload Dokumen/i });
    fireEvent.click(uploadTab);

    const file = new File(['dummy content'], 'skenario_osce.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processBtn = screen.getByRole('button', { name: /Proses Dokumen/i });
    fireEvent.click(processBtn);

    expect(screen.getByRole('button', { name: /Mengekstrak Dokumen.../i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText(/Editor Manual \(Draft\)/i)).toBeInTheDocument();
    const titleInput = screen.getByLabelText(/Judul Stase/i) as HTMLInputElement;
    expect(titleInput.value).toContain('skenario_osce.pdf');
  });

  it('saves station configuration and navigates back to mentor area page', async () => {
    render(
      <MemoryRouter>
        <OsceBuilderPage />
      </MemoryRouter>
    );

    const textarea = screen.getByPlaceholderText(/Masukkan instruksi skenario OSCE/i);
    fireEvent.change(textarea, { target: { value: 'Stase Penanganan Asma' } });
    fireEvent.click(screen.getByRole('button', { name: /^Generate Skenario$/i }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const saveBtn = screen.getByRole('button', { name: /Simpan Konfigurasi/i });
    fireEvent.click(saveBtn);

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('berhasil disimpan'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/area-mentor');
  });
});
