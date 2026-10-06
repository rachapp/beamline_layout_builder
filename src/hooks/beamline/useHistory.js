import { useState, useRef, useEffect, useCallback } from 'react';

const MAX_HISTORY = 100;
// Changes that arrive within this window are grouped into one undo step (e.g. typing a name).
const COMMIT_DELAY_MS = 350;

/**
 * Undo/redo for the layout items.
 *
 * Rather than wrapping every setItems call, this watches `items` and records a snapshot once it
 * has been stable for a moment. While `isInteracting` is true (a drag in progress) nothing is
 * recorded, so a whole drag becomes a single undo step.
 */
export const useHistory = (items, setItems, isInteracting) => {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const committedRef = useRef(items);
  const timerRef = useRef(null);
  const [, setVersion] = useState(0);
  const bump = () => setVersion(v => v + 1);

  useEffect(() => {
    if (isInteracting || items === committedRef.current) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      pastRef.current = [...pastRef.current, committedRef.current].slice(-MAX_HISTORY);
      futureRef.current = [];
      committedRef.current = items;
      bump();
    }, COMMIT_DELAY_MS);
    return () => clearTimeout(timerRef.current);
  }, [items, isInteracting]);

  const applySnapshot = (snapshot) => {
    clearTimeout(timerRef.current);
    // Marking the snapshot as committed means the effect above will not record it as a new edit.
    committedRef.current = snapshot;
    setItems(snapshot);
    bump();
  };

  const undo = useCallback(() => {
    // An edit still inside the grouping window counts as the latest step.
    if (items !== committedRef.current) {
      futureRef.current = [...futureRef.current, items];
      applySnapshot(committedRef.current);
      return;
    }
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, items];
    applySnapshot(previous);
  }, [items]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, items].slice(-MAX_HISTORY);
    applySnapshot(next);
  }, [items]);

  /** Replaces the items and clears history (used for the initial layout on startup). */
  const resetWith = useCallback((nextItems) => {
    pastRef.current = [];
    futureRef.current = [];
    applySnapshot(nextItems);
  }, []);

  return {
    undo,
    redo,
    resetWith,
    canUndo: pastRef.current.length > 0 || items !== committedRef.current,
    canRedo: futureRef.current.length > 0
  };
};
