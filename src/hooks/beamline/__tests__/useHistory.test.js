// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { useHistory } from '../useHistory.js';

const useEditor = (initial) => {
  const [items, setItems] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const history = useHistory(items, setItems, dragging);
  return { items, setItems, setDragging, ...history };
};

const settle = () => act(() => { vi.advanceTimersByTime(1000); });

describe('useHistory', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts with nothing to undo', () => {
    const { result } = renderHook(() => useEditor(['a']));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('undoes and redoes an edit', () => {
    const { result } = renderHook(() => useEditor(['a']));
    act(() => result.current.setItems(['a', 'b']));
    settle();
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.items).toEqual(['a']);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.items).toEqual(['a', 'b']);
  });

  it('groups rapid edits (like typing) into one step', () => {
    const { result } = renderHook(() => useEditor(['']));
    act(() => result.current.setItems(['S']));
    act(() => { vi.advanceTimersByTime(100); });
    act(() => result.current.setItems(['Sl']));
    act(() => { vi.advanceTimersByTime(100); });
    act(() => result.current.setItems(['Slit']));
    settle();
    act(() => result.current.undo());
    expect(result.current.items).toEqual(['']);
  });

  it('records a whole drag as one step', () => {
    const { result } = renderHook(() => useEditor([0]));
    act(() => result.current.setDragging(true));
    for (const x of [1, 2, 3, 4]) {
      act(() => result.current.setItems([x]));
      act(() => { vi.advanceTimersByTime(500); });
    }
    act(() => result.current.setDragging(false));
    settle();
    act(() => result.current.undo());
    expect(result.current.items).toEqual([0]);
  });

  it('undoes an edit that is still inside the grouping window', () => {
    const { result } = renderHook(() => useEditor(['a']));
    act(() => result.current.setItems(['a', 'b']));
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.items).toEqual(['a']);
  });

  it('clears redo after a new edit', () => {
    const { result } = renderHook(() => useEditor([1]));
    act(() => result.current.setItems([2]));
    settle();
    act(() => result.current.undo());
    act(() => result.current.setItems([3]));
    settle();
    expect(result.current.canRedo).toBe(false);
  });

  it('resetWith replaces the items and clears history', () => {
    const { result } = renderHook(() => useEditor([1]));
    act(() => result.current.setItems([2]));
    settle();
    act(() => result.current.resetWith([9]));
    settle();
    expect(result.current.items).toEqual([9]);
    expect(result.current.canUndo).toBe(false);
  });
});
