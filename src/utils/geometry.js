import { TYPES, PX_PER_M, ORIGIN_X, isAnchorType, isRangeType, isDcmType } from '../constants/index.js';

/**
 * Calculates physical length of an optic in meters.
 * For optical components, this represents the visual/physical optic length.
 */
export const getOpticPhysicalLengthM = (item) => {
  if (!item) return 1.0;
  if (isRangeType(item.type)) {
    if (item.start !== undefined && item.end !== undefined) {
      return parseFloat(Math.abs(parseFloat(item.end) - parseFloat(item.start)).toFixed(3));
    }
  }
  if (isDcmType(item.type)) {
    if (item.chamberLength !== undefined && !isNaN(item.chamberLength)) {
      return parseFloat(parseFloat(item.chamberLength).toFixed(3));
    }
    if (item.length !== undefined && !isNaN(item.length)) {
      return parseFloat(parseFloat(item.length).toFixed(3));
    }
    return 1.2;
  }
  if (item.physicalLength !== undefined && !isNaN(item.physicalLength)) {
    return parseFloat(parseFloat(item.physicalLength).toFixed(3));
  }
  if (item.length !== undefined && !isNaN(item.length)) {
    return parseFloat(parseFloat(item.length).toFixed(3));
  }
  if (item.dimX !== undefined && !isNaN(item.dimX)) {
    return parseFloat((item.dimX / PX_PER_M).toFixed(3));
  }
  const conf = TYPES[item.type];
  if (conf?.defaultLength !== undefined) return conf.defaultLength;
  if (conf?.width !== undefined) return parseFloat((conf.width / PX_PER_M).toFixed(3));
  return 1.0;
};

export const getItemLengthM = (item) => getOpticPhysicalLengthM(item);

/**
 * Calculates physical start (upstream) and end (downstream) face coordinates in meters.
 * Distinguishes between:
 * - physLen: the physical length of the optic element itself
 * - start & end: the chamber / footprint envelope boundaries
 * - len: the chamber / footprint envelope total length (end - start)
 */
export const getItemBoundsM = (item) => {
  const isRange = isRangeType(item.type);
  const isSource = item.type === 'SOURCE';
  const isDCM = isDcmType(item.type);
  const physLen = getOpticPhysicalLengthM(item);
  let dist = parseFloat(item.distance) || 0;

  if (isSource) {
    let end = item.end !== undefined ? parseFloat(item.end) : dist;
    let start = item.start !== undefined ? parseFloat(item.start) : parseFloat((end - physLen).toFixed(3));
    const len = parseFloat(Math.abs(end - start).toFixed(3));
    return {
      dist: parseFloat(end.toFixed(3)),
      len: len > 0 ? len : physLen,
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3)),
      physLen
    };
  }

  if (isDCM) {
    let start, end;
    if (item.start !== undefined && item.end !== undefined) {
      start = parseFloat(item.start);
      end = parseFloat(item.end);
    } else if (item.chamberLength !== undefined) {
      const chLen = parseFloat(item.chamberLength);
      start = parseFloat((dist - 0.5).toFixed(3));
      end = parseFloat((dist - 0.5 + chLen).toFixed(3));
    } else {
      start = parseFloat((dist - 0.5).toFixed(3));
      end = parseFloat((dist + 0.7).toFixed(3));
    }
    const boxLen = parseFloat(Math.abs(end - start).toFixed(3));
    const finalBoxLen = boxLen > 0 ? boxLen : 1.2;
    return {
      dist: parseFloat(dist.toFixed(3)),
      center: parseFloat(((start + end) / 2).toFixed(3)),
      len: finalBoxLen,
      start: parseFloat(Math.min(start, end).toFixed(3)),
      end: parseFloat(Math.max(start, end).toFixed(3)),
      physLen: finalBoxLen
    };
  }

  // Virtual steering anchors or zero-length optics
  const isVirtualAnchor = isAnchorType(item.type) || item.detectorType === 'Virtual Anchor' || item.isInvisible;
  if (isVirtualAnchor || (physLen === 0 && !isRange && !isDCM && !isSource)) {
    return {
      dist: parseFloat(dist.toFixed(3)),
      len: 0,
      start: parseFloat(dist.toFixed(3)),
      end: parseFloat(dist.toFixed(3)),
      physLen: 0
    };
  }

  // Determine start & end for footprint box / chamber:
  let start, end;
  if (item.start !== undefined && item.end !== undefined) {
    start = parseFloat(item.start);
    end = parseFloat(item.end);
  } else if (item.chamberLength !== undefined) {
    const chLen = parseFloat(item.chamberLength);
    start = parseFloat((dist - chLen / 2).toFixed(3));
    end = parseFloat((dist + chLen / 2).toFixed(3));
  } else {
    // Default footprint clearance around the optic
    const defaultBoxLen = isRange ? physLen : Math.max(physLen, parseFloat((physLen + 0.6).toFixed(3)));
    start = parseFloat((dist - defaultBoxLen / 2).toFixed(3));
    end = parseFloat((dist + defaultBoxLen / 2).toFixed(3));
  }

  if (isRange && item.start !== undefined && item.end !== undefined) {
    dist = parseFloat(((start + end) / 2).toFixed(3));
  }

  return {
    dist: parseFloat(dist.toFixed(3)),
    len: parseFloat(Math.abs(end - start).toFixed(3)),
    start: parseFloat(Math.min(start, end).toFixed(3)),
    end: parseFloat(Math.max(start, end).toFixed(3)),
    physLen
  };
};

/**
 * Recalculates start, end, dist, physLen based on user editing a specific field.
 */
export const calculateUpdatedBounds = (item, field, rawValue, constraint = 'ADJUST_LENGTH') => {
  const isRange = isRangeType(item.type);
  const isSource = item.type === 'SOURCE';
  const bounds = getItemBoundsM(item);

  const currentDist = bounds.dist;
  const currentStart = bounds.start;
  const currentEnd = bounds.end;
  const currentPhysLen = bounds.physLen;
  const currentBoxLen = bounds.len;
  const centerRef = bounds.center !== undefined ? bounds.center : currentDist;

  const val = parseFloat(rawValue);
  if (isNaN(val)) return item;

  let newStart = currentStart;
  let newEnd = currentEnd;
  let newDist = currentDist;
  let newPhysLen = currentPhysLen;
  let newBoxLen = currentBoxLen;

  const isVirtualAnchor = isAnchorType(item.type) || item.detectorType === 'Virtual Anchor' || item.isInvisible;
  const minPhysLen = isVirtualAnchor ? 0 : 0.01;

  if (field === 'physicalLength' || field === 'opticLength') {
    // Physical length of the optic itself changes - footprint box stays unchanged!
    newPhysLen = Math.max(minPhysLen, parseFloat(val.toFixed(3)));
    if (newPhysLen === 0 && isVirtualAnchor) {
      newBoxLen = 0;
      newStart = currentDist;
      newEnd = currentDist;
    } else if (isRange) {
      newBoxLen = newPhysLen;
      newStart = parseFloat((currentDist - newPhysLen / 2).toFixed(3));
      newEnd = parseFloat((currentDist + newPhysLen / 2).toFixed(3));
    }
  } else if (isSource) {
    if (field === 'start') {
      newStart = parseFloat(val.toFixed(3));
      newEnd = currentEnd;
      newPhysLen = Math.max(0.05, parseFloat((newEnd - newStart).toFixed(3)));
      newDist = newEnd;
    } else if (field === 'end') {
      newEnd = parseFloat(val.toFixed(3));
      newStart = currentStart;
      newPhysLen = Math.max(0.05, parseFloat((newEnd - newStart).toFixed(3)));
      newDist = newEnd;
    } else if (field === 'distance' || field === 'dist') {
      newDist = parseFloat(val.toFixed(3));
      newEnd = newDist;
      newStart = parseFloat((newEnd - currentPhysLen).toFixed(3));
    } else if (field === 'length') {
      newPhysLen = Math.max(0.05, parseFloat(val.toFixed(3)));
      newEnd = currentEnd;
      newStart = parseFloat((newEnd - newPhysLen).toFixed(3));
      newDist = newEnd;
    }
    newBoxLen = Math.abs(newEnd - newStart);
  } else if (field === 'start') {
    // Upstream face of the footprint / chamber
    if (constraint === 'LOCK_LENGTH' || item.lockLength) {
      // Lock chamber length: shifting upstream face moves the entire chamber envelope
      newStart = parseFloat(val.toFixed(3));
      newEnd = parseFloat((newStart + currentBoxLen).toFixed(3));
      if (isRange) newDist = parseFloat(((newStart + newEnd) / 2).toFixed(3));
    } else if (constraint === 'LOCK_CENTER' || item.lockCenter || (!item.freeDownstream && constraint !== 'ADJUST_LENGTH' && !isRange)) {
      // Symmetric / locked center: adjust both upstream and downstream equally from center
      const upMargin = Math.abs(centerRef - val);
      newStart = parseFloat((centerRef - upMargin).toFixed(3));
      newEnd = parseFloat((centerRef + upMargin).toFixed(3));
    } else {
      // Asymmetric: adjust upstream face freely without changing downstream face or physical length
      newStart = parseFloat(val.toFixed(3));
      newEnd = currentEnd;
    }
    newBoxLen = parseFloat(Math.abs(newEnd - newStart).toFixed(3));
    if (isRange) {
      newDist = parseFloat(((newStart + newEnd) / 2).toFixed(3));
      newPhysLen = newBoxLen;
    }
  } else if (field === 'end') {
    // Downstream face of the footprint / chamber
    if (constraint === 'LOCK_LENGTH' || item.lockLength) {
      // Lock chamber length: shifting downstream face moves the entire chamber envelope
      newEnd = parseFloat(val.toFixed(3));
      newStart = parseFloat((newEnd - currentBoxLen).toFixed(3));
      if (isRange) newDist = parseFloat(((newStart + newEnd) / 2).toFixed(3));
    } else if (constraint === 'LOCK_CENTER' || item.lockCenter || (!item.freeDownstream && constraint !== 'ADJUST_LENGTH' && !isRange)) {
      // Symmetric / locked center: adjust both downstream and upstream equally from center
      const downMargin = Math.abs(val - centerRef);
      newEnd = parseFloat((centerRef + downMargin).toFixed(3));
      newStart = parseFloat((centerRef - downMargin).toFixed(3));
    } else {
      // Asymmetric: adjust downstream face freely without changing upstream face or physical length
      newEnd = parseFloat(val.toFixed(3));
      newStart = currentStart;
    }
    newBoxLen = parseFloat(Math.abs(newEnd - newStart).toFixed(3));
    if (isRange) {
      newDist = parseFloat(((newStart + newEnd) / 2).toFixed(3));
      newPhysLen = newBoxLen;
    }
  } else if (field === 'chamberLength' || field === 'footprintLength') {
    // Chamber footprint length resized symmetrically around center
    newBoxLen = Math.max(0.05, parseFloat(val.toFixed(3)));
    newStart = parseFloat((centerRef - newBoxLen / 2).toFixed(3));
    newEnd = parseFloat((centerRef + newBoxLen / 2).toFixed(3));
  } else if (field === 'distance' || field === 'dist') {
    newDist = parseFloat(val.toFixed(3));
    const delta = newDist - currentDist;
    newStart = parseFloat((currentStart + delta).toFixed(3));
    newEnd = parseFloat((currentEnd + delta).toFixed(3));
    if (isRange) {
      newBoxLen = parseFloat(Math.abs(newEnd - newStart).toFixed(3));
      newPhysLen = newBoxLen;
    }
  } else if (field === 'length' || field === 'physicalLength') {
    // For general items, 'length' maps to optics physical length
    newPhysLen = Math.max(minPhysLen, parseFloat(val.toFixed(3)));
    if (newPhysLen === 0 && isVirtualAnchor) {
      newBoxLen = 0;
      newStart = currentDist;
      newEnd = currentDist;
    } else if (isRange) {
      newBoxLen = newPhysLen;
      newStart = parseFloat((currentDist - newPhysLen / 2).toFixed(3));
      newEnd = parseFloat((currentDist + newPhysLen / 2).toFixed(3));
    }
  }

  const updated = {
    ...item,
    distance: isSource ? newEnd : newDist,
    physicalLength: newPhysLen,
    length: newPhysLen, // keep length synched with physical length for optics
    chamberLength: newBoxLen,
    start: newStart,
    end: newEnd,
    x: ORIGIN_X + (isSource ? newEnd : newDist) * PX_PER_M
  };

  if (isRange) {
    updated.dimX = Math.abs(newEnd - newStart) * PX_PER_M;
  } else if (isSource) {
    updated.dimX = newPhysLen * PX_PER_M;
    if (item.sourceType !== 'Bending Magnet') {
      const pLen = item.periodLength || (item.sourceType === 'Wiggler' ? 100 : 50);
      updated.periodLength = pLen;
      updated.numPeriods = Math.max(1, Math.round((newPhysLen * 1000) / pLen));
    }
  } else if (isDcmType(item.type)) {
    updated.dimX = newBoxLen * PX_PER_M;
    updated.physicalLength = newBoxLen;
    updated.length = newBoxLen;
    updated.showFootprint = item.showFootprint !== undefined ? Boolean(item.showFootprint) : false;
    updated.showFootprintText = item.showFootprintText !== undefined ? Boolean(item.showFootprintText) : false;
  } else {
    updated.dimX = newPhysLen * PX_PER_M;
    updated.showFootprint = item.showFootprint !== undefined ? Boolean(item.showFootprint) : false;
    updated.showFootprintText = item.showFootprintText !== undefined ? Boolean(item.showFootprintText) : false;
  }

  return updated;
};
