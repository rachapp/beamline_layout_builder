// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary.jsx';

let shouldThrow = true;
const Flaky = () => {
  if (shouldThrow) throw new Error('canEditElevation is not defined');
  return <p>panel content</p>;
};

describe('ErrorBoundary', () => {
  afterEach(() => {
    cleanup();
    shouldThrow = true;
    vi.restoreAllMocks();
  });

  it('shows the panel fallback instead of crashing, and keeps siblings rendered', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <div>
        <p>other panel</p>
        <ErrorBoundary name="The Table Guide"><Flaky /></ErrorBoundary>
      </div>
    );
    expect(screen.getByText('The Table Guide hit an error')).toBeTruthy();
    expect(screen.getByText('canEditElevation is not defined')).toBeTruthy();
    expect(screen.getByText('other panel')).toBeTruthy();
  });

  it('recovers with Try again once the problem is gone', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary name="Panel"><Flaky /></ErrorBoundary>);
    shouldThrow = false;
    fireEvent.click(screen.getByText('Try again'));
    expect(screen.getByText('panel content')).toBeTruthy();
  });

  it('calls onClose from the Close button', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClose = vi.fn();
    render(<ErrorBoundary name="Panel" onClose={onClose}><Flaky /></ErrorBoundary>);
    shouldThrow = false;
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the full-screen fallback for the app boundary', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary variant="app"><Flaky /></ErrorBoundary>);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Reload Application')).toBeTruthy();
  });
});
