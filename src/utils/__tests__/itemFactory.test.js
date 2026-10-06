import { describe, it, expect } from 'vitest';
import { createPlacedItem, normalizeLegacyItems } from '../itemFactory.js';
import { TYPES, ORIGIN_X, PX_PER_M, PX_PER_MM_V, BEAM_AXIS_PX } from '../../constants/index.js';
import { getItemBoundsM } from '../geometry.js';

const at = (m) => ORIGIN_X + m * PX_PER_M;

describe('createPlacedItem', () => {
  it('creates every palette type at the clicked distance', () => {
    for (const type of Object.keys(TYPES)) {
      const view = type === 'ANCHOR_TOP' ? 'TOP' : 'SIDE';
      const item = createPlacedItem({ placingType: type, view, rawX: at(12.3), rawSecondary: BEAM_AXIS_PX, id: 1 });
      expect(item, type).not.toBeNull();
      expect(item.type).toBe(type);
      expect(item.distance).toBe(12.3);
      expect(Number.isFinite(getItemBoundsM(item).start), type).toBe(true);
    }
  });

  it('refuses a side anchor in the TOP view and a top anchor in the SIDE view', () => {
    expect(createPlacedItem({ placingType: 'ANCHOR_SIDE', view: 'TOP', rawX: at(1), rawSecondary: BEAM_AXIS_PX })).toBeNull();
    expect(createPlacedItem({ placingType: 'ANCHOR_TOP', view: 'SIDE', rawX: at(1), rawSecondary: BEAM_AXIS_PX })).toBeNull();
  });

  it('returns null for an unknown type', () => {
    expect(createPlacedItem({ placingType: 'NOPE', view: 'SIDE', rawX: at(1), rawSecondary: BEAM_AXIS_PX })).toBeNull();
  });

  it('places optics on the beam axis regardless of where you click vertically', () => {
    const slit = createPlacedItem({ placingType: 'SLIT', view: 'SIDE', rawX: at(5), rawSecondary: BEAM_AXIS_PX - 40 });
    expect(slit).toMatchObject({ y: BEAM_AXIS_PX, height: 0 });
  });

  it('gives a side anchor the clicked elevation', () => {
    const anchor = createPlacedItem({ placingType: 'ANCHOR_SIDE', view: 'SIDE', rawX: at(5), rawSecondary: BEAM_AXIS_PX - 20 * PX_PER_MM_V });
    expect(anchor.height).toBe(20);
  });

  it('creates an unlocked source (so it can be dragged and focused)', () => {
    const src = createPlacedItem({ placingType: 'SOURCE', view: 'SIDE', rawX: at(0), rawSecondary: BEAM_AXIS_PX });
    expect(src.isLocked).toBeFalsy();
    expect(getItemBoundsM(src)).toMatchObject({ start: -2, end: 0 });
  });

  it('assigns the snapped branch', () => {
    const det = createPlacedItem({ placingType: 'DETECTOR', view: 'SIDE', rawX: at(5), rawSecondary: BEAM_AXIS_PX, branch: 'diffracted' });
    expect(det.branch).toBe('diffracted');
  });
});

describe('normalizeLegacyItems', () => {
  it('returns the same array when nothing needs upgrading', () => {
    const items = [
      { type: 'SOURCE', dimY: 24, dimZ: 30 },
      { type: 'VDCM', chamberLength: 1.2, dimX: 24 },
      { type: 'XBPM', length: 0.425, dimX: 8.5 }
    ];
    expect(normalizeLegacyItems(items)).toBe(items);
  });

  it('upgrades old 0.85 m XBPMs', () => {
    const [x] = normalizeLegacyItems([{ type: 'XBPM', length: 0.85, dimX: 17 }]);
    expect(x).toMatchObject({ length: 0.425, dimX: 8.5 });
  });

  it('gives DCMs without a chamber length the default 1.2 m', () => {
    const [d] = normalizeLegacyItems([{ type: 'VDCM', dimX: 160 }]);
    expect(d).toMatchObject({ chamberLength: 1.2, dimX: 24 });
  });

  it('does not shrink a long DCM chamber that was set on purpose', () => {
    const dcm = { type: 'HDCM', chamberLength: 4, length: 4, dimX: 80 };
    expect(normalizeLegacyItems([dcm])[0]).toBe(dcm);
  });

  it('handles non-arrays', () => {
    expect(normalizeLegacyItems(undefined)).toEqual([]);
  });
});
