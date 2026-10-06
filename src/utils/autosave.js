import { TYPES } from '../constants/index.js';

export const AUTOSAVE_KEY = 'beamline_autosave_v1';

/**
 * Reads the autosaved layout from browser storage.
 * Returns null when there is nothing saved, storage is unavailable, or the saved data is not a usable layout.
 */
export const loadAutosave = (storage = globalThis.localStorage) => {
  try {
    const raw = storage?.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.items) || data.items.length === 0) return null;
    const items = data.items.filter(i => i && typeof i === 'object' && TYPES[i.type] && i.id !== undefined);
    if (items.length === 0) return null;
    const canvasLength = Number(data.canvasLength);
    return {
      items,
      canvasLength: Number.isFinite(canvasLength) && canvasLength > 0 ? canvasLength : null,
      loadedFileName: typeof data.loadedFileName === 'string' ? data.loadedFileName : '',
      savedAt: data.savedAt || null
    };
  } catch (e) {
    return null;
  }
};

export const saveAutosave = ({ items, canvasLength, loadedFileName }, storage = globalThis.localStorage) => {
  try {
    if (!items || items.length === 0) {
      storage?.removeItem(AUTOSAVE_KEY);
      return;
    }
    storage?.setItem(AUTOSAVE_KEY, JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      items,
      canvasLength,
      loadedFileName
    }));
  } catch (e) {
    // Storage full or blocked (private mode): autosave is best-effort.
  }
};
