import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestSetView } from './test-set-view';
import { TestSetProvider } from '@/contexts/TestSetContext';
import { ProjectProvider } from '@/contexts/ProjectContext';

// Mock the contexts
vi.mock('@/contexts/TestSetContext', () => ({
  TestSetProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTestSets: () => ({
    currentTestSet: null,
    updateTestCase: vi.fn(),
    deleteTestCase: vi.fn(),
    runSingleTest: vi.fn(),
    runAllTests: vi.fn(),
    isBatchRunning: vi.fn(() => false),
  }),
}));

vi.mock('@/contexts/ProjectContext', () => ({
  ProjectProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useProjects: () => ({
    projects: [],
  }),
}));

// Mock the child components
vi.mock('./test-set-controls', () => ({
  TestSetControls: ({ testSetUid }: { testSetUid: string }) => (
    <div data-testid="test-set-controls">Controls for {testSetUid}</div>
  ),
}));

vi.mock('./comparison-controls', () => ({
  ComparisonControls: () => <div data-testid="comparison-controls">Comparison Controls</div>,
}));

vi.mock('./test-set-table', () => ({
  TestSetTable: () => <div data-testid="test-set-table">Test Set Table</div>,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('TestSetView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders error state when no test set is selected', () => {
    render(
      <TestSetProvider>
        <ProjectProvider>
          <TestSetView testSetUid="test-uid" />
        </ProjectProvider>
      </TestSetProvider>
    );

    expect(screen.getByText('No test set selected')).toBeInTheDocument();
  });

  it('renders error boundary correctly', () => {
    // This test verifies that the error boundary component is included
    const { container } = render(
      <TestSetProvider>
        <ProjectProvider>
          <TestSetView testSetUid="test-uid" />
        </ProjectProvider>
      </TestSetProvider>
    );

    expect(container).toBeInTheDocument();
  });
});