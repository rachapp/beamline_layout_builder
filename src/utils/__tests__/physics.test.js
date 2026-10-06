import { describe, it, expect } from 'vitest';
import { computeBeamPaths } from '../physics.js';
import { createPlacedItem } from '../itemFactory.js';
import { ORIGIN_X, PX_PER_M, PX_PER_MM_V, BEAM_AXIS_PX } from '../../constants/index.js';

let nextId = 1;
const place = (type, distanceM, extra = {}) => ({
  ...createPlacedItem({ placingType: type, view: 'SIDE', rawX: ORIGIN_X + distanceM * PX_PER_M, rawSecondary: BEAM_AXIS_PX, id: nextId++ }),
  ...extra
});
const pointsAt = (points, id) => points.filter(p => p.parentId === id);

describe('computeBeamPaths', () => {
  it('returns empty traces for an empty layout', () => {
    const r = computeBeamPaths([]);
    expect(r.computedItems).toEqual([]);
    expect(r.tracePointsSide).toEqual([]);
    expect(r.tracePointsSideBranch).toEqual([]);
  });

  it('keeps a straight beam on the axis', () => {
    const src = place('SOURCE', 0);
    const slit = place('SLIT', 10);
    const { computedItems, tracePointsSide, tracePointsTop } = computeBeamPaths([src, slit]);
    expect(tracePointsSide.map(p => p.y)).toEqual([BEAM_AXIS_PX, BEAM_AXIS_PX]);
    expect(tracePointsTop.map(p => p.z)).toEqual([BEAM_AXIS_PX, BEAM_AXIS_PX]);
    expect(computedItems.find(i => i.id === slit.id).y).toBe(BEAM_AXIS_PX);
  });

  it('starts the beam at the source elevation', () => {
    const src = place('SOURCE', 0, { height: 50 });
    const slit = place('SLIT', 10);
    const { computedItems } = computeBeamPaths([src, slit]);
    expect(computedItems.find(i => i.id === slit.id).y).toBeCloseTo(BEAM_AXIS_PX - 50 * PX_PER_MM_V);
  });

  it('raises the beam by the exit offset after a vertical DCM', () => {
    const src = place('SOURCE', 0);
    const dcm = place('VDCM', 10, { exitOffset: 25 });
    const slit = place('SLIT', 20);
    const { computedItems, tracePointsSide } = computeBeamPaths([src, dcm, slit]);
    const [c1, c2] = pointsAt(tracePointsSide, dcm.id);
    expect(c1.y - c2.y).toBeCloseTo(25 * PX_PER_MM_V);
    expect(computedItems.find(i => i.id === slit.id).y).toBeCloseTo(BEAM_AXIS_PX - 25 * PX_PER_MM_V);
  });

  it('does not shift the SIDE beam for a horizontal DCM', () => {
    const src = place('SOURCE', 0);
    const dcm = place('HDCM', 10, { exitOffset: 25 });
    const slit = place('SLIT', 20);
    const { computedItems } = computeBeamPaths([src, dcm, slit]);
    expect(computedItems.find(i => i.id === slit.id).y).toBe(BEAM_AXIS_PX);
  });

  it('stops the beam at a detector that does not pass light', () => {
    const src = place('SOURCE', 0);
    const det = place('DETECTOR', 10);
    const slit = place('SLIT', 20);
    const { tracePointsSide } = computeBeamPaths([src, det, slit]);
    expect(pointsAt(tracePointsSide, slit.id)).toHaveLength(0);
  });

  it('steers a vertical mirror towards a downstream side anchor and reports its angle', () => {
    const src = place('SOURCE', 0);
    const mirror = place('VFM', 10);
    const anchor = { ...place('ANCHOR_SIDE', 20), height: 10, y: BEAM_AXIS_PX - 10 * PX_PER_MM_V };
    const { computedItems } = computeBeamPaths([src, mirror, anchor]);
    const m = computedItems.find(i => i.id === mirror.id);
    // 10 mm rise over 10 m = 1 mrad deflection, 0.5 mrad grazing
    expect(m.deflectAngleMrad).toBeCloseTo(1, 3);
    expect(m.grazingAngleMrad).toBeCloseTo(0.5, 3);
  });

  it('creates a diffracted branch after a splitter', () => {
    const src = place('SOURCE', 0);
    const split = place('VSPLIT', 10);
    const det = place('DETECTOR', 20, { branch: 'diffracted' });
    const { tracePointsSideBranch, computedItems } = computeBeamPaths([src, split, det]);
    expect(tracePointsSideBranch.length).toBeGreaterThan(1);
    expect(computedItems.find(i => i.id === det.id).branch).toBe('diffracted');
  });

  it('does not change the items it is given', () => {
    const items = [place('SOURCE', 0), place('VDCM', 10)];
    const before = JSON.stringify(items);
    computeBeamPaths(items);
    expect(JSON.stringify(items)).toBe(before);
  });
});
