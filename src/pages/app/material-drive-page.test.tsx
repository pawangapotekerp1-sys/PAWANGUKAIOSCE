import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MaterialDrivePage from './material-drive-page';

// Mock ProductShell
vi.mock('../../components/layout/product-shell', () => ({
  default: ({ children, navItems }: { children: React.ReactNode, navItems: any[] }) => (
    <div data-testid="product-shell" data-nav={navItems?.[0]?.label}>
      {children}
    </div>
  ),
}));

// Mock useSession
vi.mock('../../lib/auth/use-session', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../../lib/auth/use-session';

// Mock useStudentShell
vi.mock('./use-student-shell', () => ({
  useStudentShell: vi.fn(),
}));
import { useStudentShell } from './use-student-shell';

// Mock DriveExplorer
vi.mock('../../components/DriveExplorer/DriveExplorer', () => ({
  DriveExplorer: ({ driveType, isMentorOrAdmin }: { driveType: string, isMentorOrAdmin: boolean }) => (
    <div data-testid="drive-explorer" data-drivetype={driveType} data-ismentor={isMentorOrAdmin.toString()}>
      Drive Explorer
    </div>
  ),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('MaterialDrivePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly for student', () => {
    (useSession as any).mockReturnValue({ user: { id: 'student1' } });
    (useStudentShell as any).mockReturnValue({
      role: 'student',
      tierLabel: 'Basic',
      navItems: [{ label: 'Student Nav' }]
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/materi-ppt']}>
          <MaterialDrivePage driveType="ppt" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const shell = screen.getByTestId('product-shell');
    expect(shell).toBeInTheDocument();
    expect(shell).toHaveAttribute('data-nav', 'Student Nav');
    
    const driveExplorer = screen.getByTestId('drive-explorer');
    expect(driveExplorer).toHaveAttribute('data-drivetype', 'ppt');
    expect(driveExplorer).toHaveAttribute('data-ismentor', 'false');
  });

  it('renders correctly for mentor (isMentorOrAdmin = true)', () => {
    (useSession as any).mockReturnValue({ user: { id: 'mentor1' } });
    (useStudentShell as any).mockReturnValue({
      role: 'mentor',
      tierLabel: 'Mentor',
      navItems: [{ label: 'Mentor Nav' }]
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/rekaman-kelas']}>
          <MaterialDrivePage driveType="rekaman" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const shell = screen.getByTestId('product-shell');
    expect(shell).toBeInTheDocument();
    
    const driveExplorer = screen.getByTestId('drive-explorer');
    expect(driveExplorer).toHaveAttribute('data-drivetype', 'rekaman');
    expect(driveExplorer).toHaveAttribute('data-ismentor', 'true');
  });
});
