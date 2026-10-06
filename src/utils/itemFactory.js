import {
  TYPES, ORIGIN_X, PX_PER_M, PX_PER_MM_V, BEAM_AXIS_PX, FLOOR_PX,
  isRangeType, isAnchorType, isDcmType
} from '../constants/index.js';

/**
 * Builds a new item for a component dropped on the canvas.
 * `rawX` / `rawSecondary` are canvas coordinates (already snapped if snapping is on);
 * `rawSecondary` is Y in the SIDE view and Z in the TOP view.
 * Returns null when the type cannot be placed in this view (a side anchor in TOP, a top anchor in SIDE).
 */
export const createPlacedItem = ({ placingType, view, rawX, rawSecondary, branch = null, id = Date.now() }) => {
  const conf = TYPES[placingType];
  if (!conf) return null;
  if (placingType === 'ANCHOR_SIDE' && view === 'TOP') return null;
  if (placingType === 'ANCHOR_TOP' && view === 'SIDE') return null;

  const newDistance = parseFloat(((rawX - ORIGIN_X) / PX_PER_M).toFixed(2));
  const finalX = ORIGIN_X + newDistance * PX_PER_M;
  const isRange = isRangeType(placingType);
  const h = conf.height / PX_PER_M;
  const isDCM = isDcmType(placingType);
  const isChamber = placingType === 'CHAMBER';
  const isAnchor = isAnchorType(placingType);
  const isOptic = !isRange && !isChamber && !isAnchor;

  let finalDimX = conf.width;
  if (isDCM) finalDimX = 1.2 * PX_PER_M;
  else if (placingType === 'SOURCE') finalDimX = 2.0 * PX_PER_M;

  const heightFromView = parseFloat(((BEAM_AXIS_PX - rawSecondary) / PX_PER_MM_V).toFixed(1));
  const offsetFromView = parseFloat(((rawSecondary - BEAM_AXIS_PX) / PX_PER_MM_V).toFixed(1));
  const anchorUsesHeight = placingType === 'ANCHOR_SIDE' || (placingType === 'ANCHOR' && view === 'SIDE');
  const anchorUsesOffset = placingType === 'ANCHOR_TOP' || (placingType === 'ANCHOR' && view === 'TOP');

  const initialHeight = anchorUsesHeight
    ? heightFromView
    : (isOptic ? 0 : (view === 'SIDE' ? heightFromView : 0));
  const initialOffset = anchorUsesOffset
    ? offsetFromView
    : (isOptic ? 0 : (view === 'TOP' ? offsetFromView : 0));

  const newItem = {
    id,
    type: placingType,
    x: finalX,
    y: anchorUsesHeight
      ? BEAM_AXIS_PX - initialHeight * PX_PER_MM_V
      : (isOptic ? BEAM_AXIS_PX : (view === 'SIDE' ? rawSecondary : BEAM_AXIS_PX)),
    z: anchorUsesOffset
      ? BEAM_AXIS_PX + initialOffset * PX_PER_MM_V
      : (isOptic ? BEAM_AXIS_PX : (view === 'TOP' ? rawSecondary : BEAM_AXIS_PX)),
    distance: newDistance,
    height: initialHeight,
    offset: initialOffset,
    customName: conf.name,
    dimX: isAnchor ? 8 : finalDimX,
    showLabel: !isAnchor,
    showFootprint: false,
    showFootprintText: false,
    ...(placingType === 'SOURCE' ? {
      sourceType: 'Undulator',
      periodLength: 50,
      numPeriods: 40,
      length: 2.0,
      dimX: 2.0 * PX_PER_M,
      dimY: 24,
      dimZ: 30
    } : {}),
    ...(placingType === 'XBPM' ? { length: 0.425, dimX: 8.5, dimY: 8.5, dimZ: 8.5 } : {}),
    ...(isDCM ? {
      exitOffset: 25,
      braggAngle: 45,
      length: 1.2,
      physicalLength: 1.2,
      chamberLength: 1.2,
      crystal1Length: 0.5,
      crystal2Length: 0.5,
      start: parseFloat((newDistance - 0.5).toFixed(3)),
      end: parseFloat((newDistance + 0.7).toFixed(3)),
      dimY: 40,
      dimZ: 40
    } : {}),
    ...(placingType === 'VFM' || placingType === 'HFM' ? { substrateThickness: 0.3, faceHeight: 1.0, length: 2.0, physicalLength: 2.0 } : {}),
    ...(placingType === 'VSPLIT' || placingType === 'HSPLIT' ? {
      orientation: placingType === 'VSPLIT' ? 'Vertical' : 'Horizontal',
      tiltAngle: 45,
      diffractAngle: 0.5,
      length: 0.6,
      physicalLength: 0.6,
      dimX: 12,
      dimY: 12,
      dimZ: 12
    } : {}),
    ...(isRange ? {
      start: parseFloat((newDistance - (conf.width / 2 / PX_PER_M)).toFixed(2)),
      end: parseFloat((newDistance + (conf.width / 2 / PX_PER_M)).toFixed(2)),
      height: h,
      dimY: conf.height,
      dimZ: conf.height,
      y: isChamber ? BEAM_AXIS_PX : FLOOR_PX - conf.height / 2
    } : {}),
    ...(placingType === 'GRATING' ? { orientation: 'Vertical', tiltAngle: 0, diffractAngle: 15 } : {}),
    ...(placingType === 'SAMPLE' ? { passLight: true } : {}),
    ...(placingType === 'DETECTOR' ? { passLight: false, stayInPath: true, detectorType: 'Silicon Detector' } : {}),
    ...(isAnchor ? {
      length: 0,
      physicalLength: 0,
      chamberLength: 0,
      start: newDistance,
      end: newDistance,
      passLight: true,
      stayInPath: false,
      showLabel: false,
      showFootprint: false,
      showFootprintText: false
    } : {})
  };

  if (branch) newItem.branch = branch;
  return newItem;
};

/**
 * Upgrades items saved by older versions of the app to the current sizes:
 * XBPMs that used the old 0.85 m size, DCMs saved without a chamber length, and Source graphics.
 * Items that are already current are returned unchanged (same object), and the array is
 * returned as-is when nothing needed upgrading.
 */
export const normalizeLegacyItems = (items) => {
  if (!Array.isArray(items)) return [];
  let changed = false;
  const updated = items.map(item => {
    if (item.type === 'XBPM' && (item.length === 0.85 || item.dimX === 17 || !item.dimX)) {
      changed = true;
      return { ...item, length: 0.425, dimX: 8.5, dimY: 8.5, dimZ: 8.5 };
    }
    if (isDcmType(item.type) && (item.chamberLength === undefined || item.dimX === 160)) {
      changed = true;
      const chLen = (item.chamberLength && item.chamberLength <= 3) ? item.chamberLength : 1.2;
      return {
        ...item,
        length: chLen,
        physicalLength: chLen,
        chamberLength: chLen,
        dimX: chLen * PX_PER_M,
        dimY: 40,
        dimZ: 40
      };
    }
    if (item.type === 'SOURCE' && (item.dimZ !== 30 || item.dimY !== 24)) {
      changed = true;
      return { ...item, dimY: 24, dimZ: 30 };
    }
    return item;
  });
  return changed ? updated : items;
};

/** Sort comparator: upstream to downstream by centre distance. */
export const byDistance = (a, b) => (a.distance || 0) - (b.distance || 0);
