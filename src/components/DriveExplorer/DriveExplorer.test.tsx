import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { DriveExplorer } from './DriveExplorer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFolders, getLinks } from '@/lib/api/material-api';

vi.mock('@/lib/api/material-api', () => ({
  getFolders: vi.fn().mockResolvedValue([]),
  getLinks: vi.fn().mockResolvedValue([]),
  createFolder: vi.fn(),
  createLink: vi.fn(),
  deleteFolder: vi.fn(),
  deleteLink: vi.fn(),
  cloneItem: vi.fn(),
  moveItem: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('DriveExplorer', () => {
  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithProviders(<DriveExplorer driveType="rekaman" isMentorOrAdmin={false} />);
    expect(screen.getByText('Loading files...')).toBeInTheDocument();
  });

  it('renders title for VIDEO drive', async () => {
    renderWithProviders(<DriveExplorer driveType="rekaman" isMentorOrAdmin={false} />);
    const headings = await screen.findAllByText('Daftar Rekaman');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('renders title for PPT drive', async () => {
    renderWithProviders(<DriveExplorer driveType="ppt" isMentorOrAdmin={false} />);
    const headings = await screen.findAllByText('Daftar Materi');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('does not render admin buttons when isMentorOrAdmin is false', async () => {
    renderWithProviders(<DriveExplorer driveType="rekaman" isMentorOrAdmin={false} />);
    await waitFor(() => {
      expect(screen.queryByText('New Folder')).not.toBeInTheDocument();
      expect(screen.queryByText('New Link')).not.toBeInTheDocument();
    });
  });

  it('renders admin buttons when isMentorOrAdmin is true', async () => {
    renderWithProviders(<DriveExplorer driveType="rekaman" isMentorOrAdmin={true} />);
    await waitFor(() => {
      expect(screen.getByText('New Folder')).toBeInTheDocument();
      expect(screen.getByText('New Link')).toBeInTheDocument();
    });
  });

  it('navigates into a folder when clicked and updates breadcrumbs', async () => {
    (getFolders as any).mockResolvedValueOnce([
      { id: 'folder-1', name: 'Folder 1', type: 'folder', created_at: '', updated_at: '' }
    ]).mockResolvedValueOnce([]); // Mock for the second query when navigating inside

    renderWithProviders(<DriveExplorer driveType="rekaman" isMentorOrAdmin={false} />);

    // Wait for the folder to be rendered
    const folderElement = await screen.findByText('Folder 1');
    expect(folderElement).toBeInTheDocument();

    // Click the folder
    fireEvent.click(folderElement);

    // Breadcrumb should now show the folder name
    const breadcrumbElement = await screen.findByText('Folder 1', { selector: 'button.text-slate-800' });
    expect(breadcrumbElement).toBeInTheDocument();
    
    // Breadcrumb 'Home' should be clickable
    const homeBreadcrumb = screen.getByRole('button', { name: /home/i });
    expect(homeBreadcrumb).toBeInTheDocument();
    
    // Click Home to navigate back
    fireEvent.click(homeBreadcrumb);
    
    // The query for the root folder should have been called again (which now returns [])
    // Because we mocked the second call to return [], 'No items found' will appear if links is also empty
    // Let's just assert that breadcrumb is gone or back to normal
    await waitFor(() => {
      expect(screen.queryByText('Folder 1', { selector: 'button.text-slate-800' })).not.toBeInTheDocument();
    });
  });
});
