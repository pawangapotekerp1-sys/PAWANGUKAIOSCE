import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaPreviewModal, getEmbedUrl } from './MediaPreviewModal';
import { MaterialLink } from '@/lib/api/material-api';

describe('getEmbedUrl', () => {
  it('converts Google Drive file view URLs to preview URLs', () => {
    const input = 'https://drive.google.com/file/d/11XYZ_abc123/view?usp=sharing';
    expect(getEmbedUrl(input)).toBe('https://drive.google.com/file/d/11XYZ_abc123/preview');
  });

  it('converts YouTube watch URLs to embed URLs', () => {
    const input = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(getEmbedUrl(input)).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });
});

describe('MediaPreviewModal', () => {
  const mockLink: MaterialLink = {
    id: 'link-1',
    drive_type: 'VIDEO',
    title: 'Rekaman Pertemuan 1',
    url: 'https://drive.google.com/file/d/123/view',
    embed_url: 'https://drive.google.com/file/d/123/preview',
    folder_id: null,
    created_by: 'user-1',
    created_at: '2026-07-26T00:00:00Z',
    updated_at: '2026-07-26T00:00:00Z',
  };

  const mockPptLink: MaterialLink = {
    id: 'link-2',
    drive_type: 'PPT',
    title: 'Materi Farmakologi PDF',
    url: 'https://drive.google.com/file/d/456/view',
    embed_url: 'https://drive.google.com/file/d/456/preview',
    folder_id: null,
    created_by: 'user-1',
    created_at: '2026-07-26T00:00:00Z',
    updated_at: '2026-07-26T00:00:00Z',
  };

  it('renders modal with title and embed iframe when link is provided', () => {
    render(<MediaPreviewModal link={mockLink} onClose={() => {}} />);
    expect(screen.getByText('Rekaman Pertemuan 1')).toBeInTheDocument();
    expect(screen.getByTitle('Rekaman Pertemuan 1')).toHaveAttribute(
      'src',
      'https://drive.google.com/file/d/123/preview'
    );
  });

  it('provides Zoom In / Zoom Out controls for PPT & PDF files', () => {
    render(<MediaPreviewModal link={mockPptLink} onClose={() => {}} />);
    const zoomInBtn = screen.getByTitle('Perbesar / Lebarkan Teks PDF');
    expect(zoomInBtn).toBeInTheDocument();

    fireEvent.click(zoomInBtn);
    expect(screen.getByText('130% (Lebar)')).toBeInTheDocument();
  });

  it('does not render anything when link is null', () => {
    const { container } = render(<MediaPreviewModal link={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
