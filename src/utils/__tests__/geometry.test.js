import { describe, it, expect } from 'vitest';
import { getItemBoundsM, calculateUpdatedBounds, getOpticPhysicalLengthM } from '../geometry.js';
import { ORIGIN_X, PX_PER_M } from '../../constants/index.js';

describe('getItemBoundsM', () => {
  it('places a source upstream of its distance (the distance is its downstream end)', () => {
    const b = getItemBoundsM({ type: 'SOURCE', distance: 0, length: 2 });
    expect(b).toMatchObject({ dist: 0, start: -2, end: 0, len: 2 });
  });

  it('uses explicit start/end for a footprint box', () => {
    const b = getItemBoundsM({ type: 'SLIT', distance: 10, physicalLength: 0.3, start: 9.5, end: 10.7 });
    expect(b).toMatchObject({ dist: 10, start: 9.5, end: 10.7, len: 1.2, physLen: 0.3 });
  });

  it('gives an optic without start/end a default 0.6 m clearance', () => {
    const b = getItemBoundsM({ type: 'SLIT', distance: 10, physicalLength: 0.4 });
    expect(b.start).toBeCloseTo(9.5);
    expect(b.end).toBeCloseTo(10.5);
  });

  it('centres a wall on its start/end span', () => {
    const b = getItemBoundsM({ type: 'WALL', distance: 0, start: 20, end: 21 });
    expect(b.dist).toBe(20.5);
  });

  it('gives anchors zero length', () => {
    expect(getItemBoundsM({ type: 'ANCHOR_SIDE', distance: 7 })).toMatchObject({ start: 7, end: 7, len: 0, physLen: 0 });
  });

  it('starts a DCM box 0.5 m upstream of its crystal', () => {
    const b = getItemBoundsM({ type: 'VDCM', distance: 10, chamberLength: 1.2 });
    expect(b.start).toBe(9.5);
    expect(b.end).toBe(10.7);
  });
});

describe('getOpticPhysicalLengthM', () => {
  it('prefers physicalLength, then length, then dimX', () => {
    expect(getOpticPhysicalLengthM({ type: 'SLIT', physicalLength: 0.7, length: 2 })).toBe(0.7);
    expect(getOpticPhysicalLengthM({ type: 'SLIT', length: 2 })).toBe(2);
    expect(getOpticPhysicalLengthM({ type: 'SLIT', dimX: 30 })).toBe(1.5);
    expect(getOpticPhysicalLengthM({ type: 'SLIT' })).toBe(0.3);
  });
});

describe('calculateUpdatedBounds', () => {
  const slit = { type: 'SLIT', distance: 10, physicalLength: 0.3, start: 9.5, end: 10.5 };

  it('moves the footprint box with the optic when the distance changes', () => {
    const moved = calculateUpdatedBounds(slit, 'distance', 12);
    expect(moved).toMatchObject({ distance: 12, start: 11.5, end: 12.5 });
    expect(moved.x).toBe(ORIGIN_X + 12 * PX_PER_M);
  });

  it('keeps the box length when Lock Length is on and the upstream face moves', () => {
    const r = calculateUpdatedBounds(slit, 'start', 9, 'LOCK_LENGTH');
    expect(r).toMatchObject({ start: 9, end: 10 });
  });

  it('resizes symmetrically when Lock Center is on', () => {
    const r = calculateUpdatedBounds(slit, 'start', 9, 'LOCK_CENTER');
    expect(r).toMatchObject({ start: 9, end: 11 });
  });

  it('moves only the upstream face by default', () => {
    const r = calculateUpdatedBounds(slit, 'start', 9);
    expect(r).toMatchObject({ start: 9, end: 10.5 });
  });

  it('keeps a source anchored at its downstream end when its length changes', () => {
    const r = calculateUpdatedBounds({ type: 'SOURCE', distance: 0, length: 2, periodLength: 50 }, 'length', 3);
    expect(r).toMatchObject({ start: -3, end: 0, distance: 0, numPeriods: 60 });
  });

  it('ignores non-numeric input', () => {
    expect(calculateUpdatedBounds(slit, 'distance', 'abc')).toBe(slit);
  });
});
