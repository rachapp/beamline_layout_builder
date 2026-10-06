import { describe, it, expect } from 'vitest';
import { loadAutosave, saveAutosave, AUTOSAVE_KEY } from '../autosave.js';
import { numOr } from '../index.js';
import { readCsvBeamlineLength } from '../../hooks/beamline/useTemplates.js';
import {
  canEditElevation, canEditOffset, hasManualPosition, isRangeType, isWallType, isAnchorType, isVirtualAnchor
} from '../../constants/index.js';

const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k)
  };
};

describe('autosave', () => {
  it('round-trips a layout', () => {
    const storage = memoryStorage();
    const items = [{ id: 1, type: 'SOURCE', distance: 0 }, { id: 'imported_2', type: 'SLIT', distance: 5 }];
    saveAutosave({ items, canvasLength: 42, loadedFileName: 'x.csv' }, storage);
    expect(loadAutosave(storage)).toMatchObject({ items, canvasLength: 42, loadedFileName: 'x.csv' });
  });

  it('clears the save when the layout is empty', () => {
    const storage = memoryStorage();
    saveAutosave({ items: [{ id: 1, type: 'SLIT' }], canvasLength: 10 }, storage);
    saveAutosave({ items: [], canvasLength: 10 }, storage);
    expect(storage.getItem(AUTOSAVE_KEY)).toBeNull();
  });

  it('ignores corrupt or foreign data', () => {
    const storage = memoryStorage();
    storage.setItem(AUTOSAVE_KEY, '{not json');
    expect(loadAutosave(storage)).toBeNull();
    storage.setItem(AUTOSAVE_KEY, JSON.stringify({ items: [{ id: 1, type: 'SPACESHIP' }] }));
    expect(loadAutosave(storage)).toBeNull();
  });

  it('survives storage that throws (private browsing)', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadAutosave(broken)).toBeNull();
    expect(() => saveAutosave({ items: [{ id: 1, type: 'SLIT' }] }, broken)).not.toThrow();
  });
});

describe('numOr', () => {
  it('falls back for missing and non-numeric values', () => {
    expect(numOr(undefined, 2.5)).toBe(2.5);
    expect(numOr('', 2.5)).toBe(2.5);
    expect(numOr('abc', 2.5)).toBe(2.5);
    expect(numOr(null, 0)).toBe(0);
  });

  it('keeps real numbers, including zero', () => {
    expect(numOr(0, 2.5)).toBe(0);
    expect(numOr('1.25', 2.5)).toBe(1.25);
  });
});

describe('readCsvBeamlineLength', () => {
  it('reads the length from the export header', () => {
    expect(readCsvBeamlineLength('# Total Beamline Length: 58 m | Components: 18')).toBe(58);
    expect(readCsvBeamlineLength('no header')).toBeNull();
  });
});

describe('type helpers', () => {
  it('match the editable-position rules used by the Table Guide and Properties panel', () => {
    expect(['SOURCE', 'DETECTOR', 'ANCHOR', 'ANCHOR_SIDE'].every(canEditElevation)).toBe(true);
    expect(canEditElevation('ANCHOR_TOP')).toBe(false);
    expect(canEditElevation('SLIT')).toBe(false);
    expect(['SOURCE', 'DETECTOR', 'ANCHOR', 'ANCHOR_TOP'].every(canEditOffset)).toBe(true);
    expect(canEditOffset('ANCHOR_SIDE')).toBe(false);
    expect(hasManualPosition('ANCHOR_TOP')).toBe(true);
    expect(hasManualPosition('VFM')).toBe(false);
  });

  it('group construction and anchor types', () => {
    expect(isRangeType('CHAMBER')).toBe(true);
    expect(isWallType('CHAMBER')).toBe(false);
    expect(isAnchorType('ANCHOR_TOP')).toBe(true);
    expect(isVirtualAnchor({ type: 'DETECTOR', detectorType: 'Virtual Anchor' })).toBe(true);
    expect(isVirtualAnchor({ type: 'DETECTOR' })).toBe(false);
  });
});
