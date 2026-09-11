import { TYPES, PX_PER_M, ORIGIN_X, PX_PER_MM_V, PX_PER_M_V } from '../constants/index.js';
import { getItemVisualHeight } from './index.js';

/**
 * Calculates physical length of an optic in meters.
 * For optical components, this represents the visual/physical optic length.
 */
export const getOpticPhysicalLengthM = (item) => {
  if (!item) return 1.0;
  if (['WALL', 'HUTCH', 'CHAMBER'].includes(item.type)) {
    if (item.start !== undefined && item.end !== undefined) {
      return parseFloat(Math.abs(parseFloat(item.end) - parseFloat(item.start)).toFixed(3));
    }
  }
  if (['VDCM', 'HDCM'].includes(item.type)) {
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
  const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
  const isSource = item.type === 'SOURCE';
  const isDCM = ['VDCM', 'HDCM'].includes(item.type);
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
    const parsedD = parseFloat(item.exitOffset);
    const D_mm = !isNaN(parsedD) ? (parsedD > 0 && parsedD <= 1.0 ? parsedD * 100 : parsedD) : 25;
    const D_px = D_mm * PX_PER_MM_V;
    const parsedTh = parseFloat(item.braggAngle);
    const th_deg = !isNaN(parsedTh) ? parsedTh : 45;
    const tan2th = Math.tan(2 * th_deg * Math.PI / 180);
    const L_px = Math.abs(th_deg - 45) < 0.001 ? 0 : (Math.abs(tan2th) > 0.001 ? Math.abs(D_px / tan2th) : 0);
    const L_m = L_px / PX_PER_M;

    let start, end;
    if (item.start !== undefined && item.end !== undefined) {
      start = parseFloat(item.start);
      end = parseFloat(item.end);
    } else if (item.chamberLength !== undefined) {
      const chLen = parseFloat(item.chamberLength);
      start = parseFloat((dist - 0.5).toFixed(3));
      end = parseFloat((dist - 0.5 + chLen).toFixed(3));
    } else {
      const defaultBoxLen = 1.2;
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
  const isVirtualAnchor = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type) || item.detectorType === 'Virtual Anchor' || item.isInvisible;
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
  const conf = TYPES[item.type] || { defaultLength: 1.0, width: 20 };
  const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
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

  const isVirtualAnchor = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type) || item.detectorType === 'Virtual Anchor' || item.isInvisible;
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
  } else if (['VDCM', 'HDCM'].includes(item.type)) {
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

/**
 * Resolves component-specific miscellaneous parameters (Misc A, B, C, D)
 * and label offset position tracking.
 */
export const getItemMiscParams = (item, activeView) => {
  if (!item) return { miscA: '', miscB: '', miscC: '', miscD: '', labelX: 0, labelY: 0 };
  const type = item.type;
  let miscA = '', miscB = '', miscC = '', miscD = '';

  if (['VDCM', 'HDCM'].includes(type)) {
    miscA = item.exitOffset ?? 25;
    miscB = item.braggAngle ?? 45;
    miscC = item.crystal1Length ?? 0.5;
    miscD = item.crystal2Length ?? 0.5;
  } else if (type === 'GRATING') {
    miscA = item.orientation || 'Vertical';
    miscB = item.diffractAngle ?? 15;
    miscC = item.tiltAngle ?? 0;
    miscD = item.miscD ?? '';
  } else if (['VFM', 'HFM'].includes(type)) {
    miscA = item.physicalLength ?? item.length ?? (item.dimX ? item.dimX / PX_PER_M : 1.0);
    miscB = item.grazingAngle ?? item.deflectAngle ?? 0;
    miscC = item.focalLength ?? '';
    miscD = item.substrateThickness !== undefined ? item.substrateThickness : (item.miscD !== undefined ? item.miscD : 0.3);
  } else if (type === 'SOURCE') {
    miscA = item.sourceType || 'Undulator';
    miscB = item.periodLength ?? 50;
    miscC = item.numPeriods ?? 40;
    miscD = item.rayStyle || 'dashed';
  } else if (['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(type)) {
    miscA = '';
    miscB = '';
    miscC = '';
    miscD = '';
  } else if (type === 'DETECTOR') {
    miscA = item.detectorType || 'Silicon Detector';
    miscB = (item.passLight === true) ? 'YES' : 'NO';
    miscC = item.stayInPath !== false ? 'YES' : 'NO';
    miscD = item.miscD ?? '';
  } else if (type === 'SAMPLE') {
    miscA = item.passLight !== false ? 'YES' : 'NO';
    miscB = item.miscB ?? '';
    miscC = item.miscC ?? '';
    miscD = item.miscD ?? '';
  } else if (['WALL', 'HUTCH'].includes(type)) {
    miscA = item.wallWidth !== undefined ? item.wallWidth : (item.dimZ ? item.dimZ / PX_PER_M : 7.0);
    miscB = item.wallHeight !== undefined ? item.wallHeight : (item.height ?? 7.0);
    miscC = item.miscC ?? '';
    miscD = item.miscD ?? '';
  } else if (type === 'CHAMBER') {
    miscA = item.height !== undefined ? item.height : (item.dimY ? item.dimY / PX_PER_M : 3.0);
    miscB = item.miscB ?? '';
    miscC = item.miscC ?? '';
    miscD = item.miscD ?? '';
  } else if (['VSPLIT', 'HSPLIT'].includes(type)) {
    miscA = item.tiltAngle ?? 45;
    miscB = item.diffractAngle ?? 0.5;
    miscC = item.miscC ?? '';
    miscD = item.miscD ?? '';
  } else {
    miscA = item.miscA ?? '';
    miscB = item.miscB ?? '';
    miscC = item.miscC ?? '';
    miscD = item.miscD ?? '';
  }

  const viewKey = (activeView === 'TOP' || activeView === 'SIDE') ? activeView : null;
  const labelX = viewKey 
    ? (item.labelOffsets?.[viewKey]?.x ?? item.labelOffsets?.SIDE?.x ?? item.labelOffsets?.TOP?.x ?? item.labelOffsetX ?? 0)
    : (item.labelOffsets?.SIDE?.x ?? item.labelOffsets?.TOP?.x ?? item.labelOffsetX ?? 0);
  const labelY = viewKey 
    ? (item.labelOffsets?.[viewKey]?.y ?? item.labelOffsets?.SIDE?.y ?? item.labelOffsets?.TOP?.y ?? item.labelOffsetY ?? 0)
    : (item.labelOffsets?.SIDE?.y ?? item.labelOffsets?.TOP?.y ?? item.labelOffsetY ?? 0);

  const labelSideX = item.labelOffsets?.SIDE?.x ?? item.labelOffsetX ?? '';
  const labelSideY = item.labelOffsets?.SIDE?.y ?? item.labelOffsetY ?? '';
  const labelTopX = item.labelOffsets?.TOP?.x ?? item.labelOffsetX ?? '';
  const labelTopY = item.labelOffsets?.TOP?.y ?? item.labelOffsetY ?? '';

  return { 
    miscA, 
    miscB, 
    miscC, 
    miscD, 
    labelX: typeof labelX === 'number' ? parseFloat(labelX.toFixed(1)) : (parseFloat(labelX) || 0), 
    labelY: typeof labelY === 'number' ? parseFloat(labelY.toFixed(1)) : (parseFloat(labelY) || 0),
    labelSideX: typeof labelSideX === 'number' ? parseFloat(labelSideX.toFixed(1)) : (labelSideX !== '' ? (parseFloat(labelSideX) || 0) : ''),
    labelSideY: typeof labelSideY === 'number' ? parseFloat(labelSideY.toFixed(1)) : (labelSideY !== '' ? (parseFloat(labelSideY) || 0) : ''),
    labelTopX: typeof labelTopX === 'number' ? parseFloat(labelTopX.toFixed(1)) : (labelTopX !== '' ? (parseFloat(labelTopX) || 0) : ''),
    labelTopY: typeof labelTopY === 'number' ? parseFloat(labelTopY.toFixed(1)) : (labelTopY !== '' ? (parseFloat(labelTopY) || 0) : '')
  };
};

/**
 * Returns human-readable labels for Misc A, B, C, D per component type.
 */
export const getMiscParamLabels = (type) => {
  if (['VDCM', 'HDCM'].includes(type)) {
    return {
      miscA: 'Exit Offset (m)',
      miscB: 'Bragg Angle (°)',
      miscC: 'Cryst 1 Len (m)',
      miscD: 'Cryst 2 Len (m)'
    };
  }
  if (type === 'GRATING') {
    return {
      miscA: 'Dispersion Plane',
      miscB: 'Deflect Beam (°)',
      miscC: 'Tilt Offset (°)',
      miscD: 'Misc D'
    };
  }
  if (['VFM', 'HFM'].includes(type)) {
    return {
      miscA: 'Mirror Dist/Len (m)',
      miscB: 'Grazing/Deflect (°)',
      miscC: 'Focal Len (m)',
      miscD: 'Thickness (m)'
    };
  }
  if (['VSPLIT', 'HSPLIT'].includes(type)) {
    return {
      miscA: 'Tilt Angle (°)',
      miscB: 'Diffract Angle (°)',
      miscC: 'Misc C',
      miscD: 'Misc D'
    };
  }
  if (type === 'SOURCE') {
    return {
      miscA: 'Source Type',
      miscB: 'Period (mm)',
      miscC: 'Num Periods',
      miscD: 'Ray Style'
    };
  }
  if (['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(type)) {
    return {
      miscA: '-',
      miscB: '-',
      miscC: '-',
      miscD: '-'
    };
  }
  if (type === 'DETECTOR') {
    return {
      miscA: 'Detector Type',
      miscB: 'Pass Light',
      miscC: 'Stay In Path',
      miscD: 'Misc D'
    };
  }
  if (type === 'SAMPLE') {
    return {
      miscA: 'Pass Light',
      miscB: 'Misc B',
      miscC: 'Misc C',
      miscD: 'Misc D'
    };
  }
  if (['WALL', 'HUTCH'].includes(type)) {
    return {
      miscA: `${type === 'HUTCH' ? 'Hutch' : 'Wall'} Width (m)`,
      miscB: `${type === 'HUTCH' ? 'Hutch' : 'Wall'} Height (m)`,
      miscC: 'Misc C',
      miscD: 'Misc D'
    };
  }
  if (type === 'CHAMBER') {
    return {
      miscA: 'Height/Width (m)',
      miscB: 'Misc B',
      miscC: 'Misc C',
      miscD: 'Misc D'
    };
  }
  return {
    miscA: 'Misc A',
    miscB: 'Misc B',
    miscC: 'Misc C',
    miscD: 'Misc D'
  };
};

/**
 * Applies a miscellaneous parameter update to an item.
 */
export const setItemMiscParam = (item, key, val, activeView) => {
  const type = item.type;
  const updated = { ...item };

  if (key === 'miscA') {
    if (['WALL', 'HUTCH'].includes(type)) {
      const num = parseFloat(val) || 0;
      updated.wallWidth = num;
      updated.dimZ = num * PX_PER_M;
    }
    else if (type === 'CHAMBER') {
      const num = parseFloat(val) || 0;
      updated.height = num;
      updated.dimY = num * PX_PER_M;
      updated.dimZ = num * PX_PER_M;
      updated.y = 150 - num * PX_PER_M;
    }
    else if (['VDCM', 'HDCM'].includes(type)) {
      const num = parseFloat(val);
      const parsedVal = isNaN(num) ? (val === '' ? '' : 25) : (num > 0 && num <= 1.0 ? num * 100 : num);
      updated.exitOffset = parsedVal;
      const chLen = updated.chamberLength ?? 1.5;
      updated.dimX = chLen * PX_PER_M;
    }
    else if (type === 'GRATING') updated.orientation = val;
    else if (['VFM', 'HFM'].includes(type)) {
      const num = parseFloat(val) || 0;
      if (num > 0) {
        updated.physicalLength = num;
        updated.length = num;
        updated.dimX = num * PX_PER_M;
      }
      delete updated.physicalDistance;
      delete updated.mirrorLength;
    }
    else if (type === 'SOURCE') {
      updated.sourceType = val;
      if (val === 'Bending Magnet') {
        updated.length = 1.5;
        updated.dimX = 30;
      } else {
        const pLen = updated.periodLength || (val === 'Wiggler' ? 100 : 50);
        const numP = updated.numPeriods || (val === 'Wiggler' ? 20 : 40);
        updated.periodLength = pLen;
        updated.numPeriods = numP;
        updated.length = parseFloat(((pLen * numP) / 1000).toFixed(3));
        updated.dimX = updated.length * PX_PER_M;
      }
      updated.physicalLength = updated.length;
      if (updated.distance !== undefined) {
        updated.end = updated.distance;
        updated.start = parseFloat((updated.end - updated.length).toFixed(3));
      }
    }
    else if (['VSPLIT', 'HSPLIT'].includes(type)) updated.tiltAngle = parseFloat(val) || 45;
    else if (type === 'DETECTOR') updated.detectorType = val;
    else if (type === 'SAMPLE') updated.passLight = ['yes', 'true', '1'].includes(String(val).toLowerCase());
    else updated.miscA = val;
  } else if (key === 'miscB') {
    if (['WALL', 'HUTCH'].includes(type)) {
      const num = parseFloat(val) || 0;
      updated.wallHeight = num;
      updated.height = num;
      updated.dimY = num * PX_PER_M;
      updated.y = 200 - (num * PX_PER_M) / 2;
    }
    else if (['VDCM', 'HDCM'].includes(type)) {
      const num = parseFloat(val);
      updated.braggAngle = isNaN(num) ? (val === '' ? '' : 45) : num;
      const chLen = updated.chamberLength ?? 2.5;
      updated.dimX = chLen * PX_PER_M;
    }
    else if (type === 'GRATING') updated.diffractAngle = parseFloat(val) || 0;
    else if (['VFM', 'HFM'].includes(type)) {
      const num = parseFloat(val) || 0;
      updated.grazingAngle = num;
      updated.deflectAngle = num;
    }
    else if (type === 'SOURCE') {
      updated.periodLength = parseFloat(val) || 0;
      if (updated.sourceType !== 'Bending Magnet' && updated.numPeriods) {
        updated.length = parseFloat(((updated.periodLength * updated.numPeriods) / 1000).toFixed(3));
        updated.dimX = updated.length * PX_PER_M;
        updated.physicalLength = updated.length;
        if (updated.distance !== undefined) {
          updated.end = updated.distance;
          updated.start = parseFloat((updated.end - updated.length).toFixed(3));
        }
      }
    }
    else if (['VSPLIT', 'HSPLIT'].includes(type)) updated.diffractAngle = parseFloat(val) || 0.5;
    else if (type === 'DETECTOR') updated.passLight = ['yes', 'true', '1'].includes(String(val).toLowerCase());
    else updated.miscB = val;
  } else if (key === 'miscC') {
    if (['VDCM', 'HDCM'].includes(type)) updated.crystal1Length = parseFloat(val) || 0;
    else if (type === 'GRATING') updated.tiltAngle = parseFloat(val) || 0;
    else if (['VFM', 'HFM'].includes(type)) updated.focalLength = parseFloat(val) || 0;
    else if (type === 'SOURCE') {
      updated.numPeriods = parseInt(val) || 0;
      if (updated.sourceType !== 'Bending Magnet' && updated.periodLength) {
        updated.length = parseFloat(((updated.periodLength * updated.numPeriods) / 1000).toFixed(3));
        updated.dimX = updated.length * PX_PER_M;
        updated.physicalLength = updated.length;
        if (updated.distance !== undefined) {
          updated.end = updated.distance;
          updated.start = parseFloat((updated.end - updated.length).toFixed(3));
        }
      }
    }
    else if (type === 'DETECTOR') updated.stayInPath = ['yes', 'true', '1'].includes(String(val).toLowerCase());
    else updated.miscC = val;
  } else if (key === 'miscD') {
    if (['VDCM', 'HDCM'].includes(type)) updated.crystal2Length = parseFloat(val) || 0;
    else if (['VFM', 'HFM'].includes(type)) {
      const num = parseFloat(val);
      const v = !isNaN(num) && num > 0 ? num : 0.3;
      updated.substrateThickness = v;
      updated.miscD = v;
    }
    else if (type === 'SOURCE') updated.rayStyle = val;
    else updated.miscD = val;
  } else if (key === 'labelSideX') {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      updated.labelOffsets = {
        ...(item.labelOffsets || {}),
        SIDE: { ...(item.labelOffsets?.SIDE || {}), x: num }
      };
    }
  } else if (key === 'labelSideY') {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      updated.labelOffsets = {
        ...(item.labelOffsets || {}),
        SIDE: { ...(item.labelOffsets?.SIDE || {}), y: num }
      };
    }
  } else if (key === 'labelTopX') {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      updated.labelOffsets = {
        ...(item.labelOffsets || {}),
        TOP: { ...(item.labelOffsets?.TOP || {}), x: num }
      };
    }
  } else if (key === 'labelTopY') {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      updated.labelOffsets = {
        ...(item.labelOffsets || {}),
        TOP: { ...(item.labelOffsets?.TOP || {}), y: num }
      };
    }
  } else if (key === 'labelX' || key === 'labelOffsetX') {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const targetView = (activeView === 'TOP' || activeView === 'SIDE') ? activeView : null;
      updated.labelOffsetX = num;
      updated.labelOffsets = {
        ...(item.labelOffsets || {}),
        ...(targetView
          ? { [targetView]: { ...(item.labelOffsets?.[targetView] || {}), x: num } }
          : {
              SIDE: { ...(item.labelOffsets?.SIDE || {}), x: num },
              TOP: { ...(item.labelOffsets?.TOP || {}), x: num }
            })
      };
    }
  } else if (key === 'labelY' || key === 'labelOffsetY') {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const targetView = (activeView === 'TOP' || activeView === 'SIDE') ? activeView : null;
      updated.labelOffsetY = num;
      updated.labelOffsets = {
        ...(item.labelOffsets || {}),
        ...(targetView
          ? { [targetView]: { ...(item.labelOffsets?.[targetView] || {}), y: num } }
          : {
              SIDE: { ...(item.labelOffsets?.SIDE || {}), y: num },
              TOP: { ...(item.labelOffsets?.TOP || {}), y: num }
            })
      };
    }
  }

  return updated;
};

/**
 * Computes full construction schedule, spatial clearances, and overlap detection.
 */
export const computeConstructionSchedule = (items = [], canvasLength = 50) => {
  // Sort all items by upstream start position, then by center distance
  const sorted = [...items].sort((a, b) => {
    const bA = getItemBoundsM(a);
    const bB = getItemBoundsM(b);
    return bA.start - bB.start || bA.dist - bB.dist;
  });

  const enclosures = sorted.filter(i => ['HUTCH', 'CHAMBER', 'WALL'].includes(i.type));
  const opticalItems = sorted.filter(i => !['HUTCH', 'CHAMBER', 'WALL'].includes(i.type));

  const overlaps = [];
  let totalOpticalLength = 0;

  // Process all items
  const schedule = sorted.map((item, idx) => {
    const bounds = getItemBoundsM(item);
    const isAnchorType = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type);
    const isVirtualAnchor = isAnchorType || item.detectorType === 'Virtual Anchor' || item.isInvisible;
    const isOptical = !['WALL', 'HUTCH', 'CHAMBER'].includes(item.type) && !isVirtualAnchor;
    if (isOptical) totalOpticalLength += bounds.len;

    // Determine enclosure containment
    let enclosureName = 'Open Beamline';
    for (const enc of enclosures) {
      if (enc.id === item.id) continue;
      const eb = getItemBoundsM(enc);
      if (bounds.start >= eb.start - 0.05 && bounds.end <= eb.end + 0.05) {
        enclosureName = enc.customName || TYPES[enc.type]?.name || enc.type;
        break;
      }
    }

    // Gap to next physical item in list (skipping virtual anchors)
    let gapToNext = null;
    let nextItemName = null;
    if (!isVirtualAnchor) {
      if (item.type === 'HUTCH') {
        // Enclosures check gap to next enclosure
        const nextEnclosure = sorted.slice(idx + 1).find(i => ['HUTCH', 'CHAMBER'].includes(i.type));
        if (nextEnclosure) {
          const nextBounds = getItemBoundsM(nextEnclosure);
          gapToNext = parseFloat((nextBounds.start - bounds.end).toFixed(3));
          nextItemName = nextEnclosure.customName || TYPES[nextEnclosure.type]?.name || nextEnclosure.type;
        } else {
          gapToNext = parseFloat((canvasLength - bounds.end).toFixed(3));
          nextItemName = 'End of Beamline';
        }
      } else {
        // Optical items and walls check gap to next optical item or wall (excluding enclosing hutches)
        // Also respect branch: if downstream of a splitter, only compare same-branch items
        const itemBranch = item.branch || 'straight';
        const nextPhysical = sorted.slice(idx + 1).find(i => {
          if (['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(i.type) || i.detectorType === 'Virtual Anchor' || i.isInvisible || i.type === 'HUTCH') return false;
          // VSPLIT/HSPLIT are shared (not branch-specific), always check them
          if (i.type === 'VSPLIT' || i.type === 'HSPLIT' || item.type === 'VSPLIT' || item.type === 'HSPLIT') return true;
          // If either item has a branch, both must be on the same branch
          if (i.branch && itemBranch && i.branch !== itemBranch) return false;
          return true;
        });
        if (nextPhysical) {
          const nextBounds = getItemBoundsM(nextPhysical);
          gapToNext = parseFloat((nextBounds.start - bounds.end).toFixed(3));
          nextItemName = nextPhysical.customName || TYPES[nextPhysical.type]?.name || nextPhysical.type;
        } else {
          gapToNext = parseFloat((canvasLength - bounds.end).toFixed(3));
          nextItemName = 'End of Beamline';
        }
      }
    }

    const misc = getItemMiscParams(item);
    const miscLabels = getMiscParamLabels(item.type);

    const hasSpatialOverlap = !isVirtualAnchor && gapToNext !== null && gapToNext < -0.005;

    return {
      index: idx + 1,
      id: item.id,
      item,
      name: item.customName || TYPES[item.type]?.name || item.type,
      type: item.type,
      typeName: TYPES[item.type]?.name || item.type,
      isOptical,
      isEnclosure: !isOptical,
      dist: bounds.dist,
      length: bounds.len,               // chamber footprint box length
      physLength: bounds.physLen,       // optics physical length
      start: bounds.start,
      end: bounds.end,
      freeDownstream: Boolean(item.freeDownstream),
      showFootprint: Boolean(item.showFootprint),
      showFootprintText: Boolean(item.showFootprintText),
      isLocked: Boolean(item.isLocked),
      height: ['WALL', 'HUTCH'].includes(item.type)
        ? (item.wallHeight !== undefined ? parseFloat(item.wallHeight) : (item.height !== undefined ? parseFloat(item.height) : 7.0))
        : (item.type === 'CHAMBER'
          ? (item.height !== undefined ? parseFloat(item.height) : (item.dimY ? parseFloat((item.dimY / PX_PER_M).toFixed(3)) : 3.0))
          : ((item.type === 'SOURCE' || isAnchorType || (item.type === 'DETECTOR' && item.stayInPath === false))
            ? (item.height !== undefined && item.height !== null && !isNaN(Number(item.height))
                ? parseFloat(Number(item.height).toFixed(1))
                : (item.y !== undefined ? parseFloat(((150 - item.y) / PX_PER_MM_V).toFixed(1)) : 0))
            : (item.y !== undefined ? parseFloat(((150 - item.y) / PX_PER_MM_V).toFixed(1)) : (item.height !== undefined ? parseFloat(Number(item.height).toFixed(1)) : 0)))),
      offset: ['WALL', 'HUTCH'].includes(item.type)
        ? 0
        : ((item.type === 'SOURCE' || isAnchorType || (item.type === 'DETECTOR' && item.stayInPath === false))
          ? (item.offset !== undefined && item.offset !== null && !isNaN(Number(item.offset))
              ? parseFloat(Number(item.offset).toFixed(1))
              : (item.z !== undefined ? parseFloat((((item.z) - 150) / PX_PER_MM_V).toFixed(1)) : 0))
          : (item.z !== undefined ? parseFloat((((item.z) - 150) / PX_PER_MM_V).toFixed(1)) : (item.offset !== undefined ? parseFloat(Number(item.offset).toFixed(1)) : 0))),
      heightMm: ['WALL', 'HUTCH'].includes(item.type)
        ? null
        : ((item.type === 'SOURCE' || isAnchorType || (item.type === 'DETECTOR' && item.stayInPath === false))
          ? (item.height !== undefined && item.height !== null && !isNaN(Number(item.height))
              ? parseFloat(Number(item.height).toFixed(1))
              : (item.y !== undefined ? parseFloat(((150 - item.y) / PX_PER_MM_V).toFixed(1)) : 0))
          : (item.y !== undefined ? parseFloat(((150 - item.y) / PX_PER_MM_V).toFixed(1)) : (item.height !== undefined ? parseFloat(Number(item.height).toFixed(1)) : 0))),
      offsetMm: ['WALL', 'HUTCH'].includes(item.type)
        ? null
        : ((item.type === 'SOURCE' || isAnchorType || (item.type === 'DETECTOR' && item.stayInPath === false))
          ? (item.offset !== undefined && item.offset !== null && !isNaN(Number(item.offset))
              ? parseFloat(Number(item.offset).toFixed(1))
              : (item.z !== undefined ? parseFloat((((item.z) - 150) / PX_PER_MM_V).toFixed(1)) : 0))
          : (item.z !== undefined ? parseFloat((((item.z) - 150) / PX_PER_MM_V).toFixed(1)) : (item.offset !== undefined ? parseFloat(Number(item.offset).toFixed(1)) : 0))),
      misc,
      miscLabels,
      enclosureName,
      gapToNext,
      nextItemName,
      isOverlap: hasSpatialOverlap,
      overlapAmount: hasSpatialOverlap ? Math.abs(gapToNext) : 0,
      branch: item.branch || null,
      statusText: isVirtualAnchor ? 'Anchor Point' : (hasSpatialOverlap ? 'Overlap' : (gapToNext === 0 ? 'Abutting' : 'OK'))
    };
  });

  // Calculate gaps between optical components specifically
  opticalItems.forEach((opt, oIdx) => {
    if (oIdx < opticalItems.length - 1) {
      const nextOpt = opticalItems[oIdx + 1];
      const isAnchorA = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(opt.type) || opt.detectorType === 'Virtual Anchor' || opt.isInvisible;
      const isAnchorB = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(nextOpt.type) || nextOpt.detectorType === 'Virtual Anchor' || nextOpt.isInvisible;
      if (isAnchorA || isAnchorB) return;

      // Skip cross-branch collision check: items on different branches don't share the same beam path
      const branchA = opt.branch || 'straight';
      const branchB = nextOpt.branch || 'straight';
      if (branchA !== branchB) return;

      const currB = getItemBoundsM(opt);
      const nextB = getItemBoundsM(nextOpt);
      const gap = parseFloat((nextB.start - currB.end).toFixed(3));
      if (gap < -0.005) {
        overlaps.push({
          itemA: opt,
          itemB: nextOpt,
          nameA: opt.customName || TYPES[opt.type]?.name || opt.type,
          nameB: nextOpt.customName || TYPES[nextOpt.type]?.name || nextOpt.type,
          overlapDistance: Math.abs(gap)
        });
      }
    }
  });

  const opticalCount = opticalItems.length;
  const freeBeamlineSpace = Math.max(0, parseFloat((canvasLength - totalOpticalLength).toFixed(3)));
  const spaceUtilization = canvasLength > 0 ? parseFloat(((totalOpticalLength / canvasLength) * 100).toFixed(1)) : 0;

  return {
    rows: schedule,
    opticalRows: schedule.filter(r => r.isOptical),
    enclosureRows: schedule.filter(r => r.isEnclosure),
    totalCount: schedule.length,
    opticalCount,
    enclosureCount: enclosures.length,
    totalOpticalLength: parseFloat(totalOpticalLength.toFixed(3)),
    freeBeamlineSpace,
    spaceUtilization,
    canvasLength,
    overlaps,
    hasOverlaps: overlaps.length > 0
  };
};

/**
 * Generates CSV string for construction and civil engineering guide.
 */
export const generateCsvContent = (scheduleData, beamlineName = 'Synchrotron Beamline') => {
  const headers = [
    'Sequence #',
    'Component Name',
    'Type',
    'Center Position X (m)',
    'Optics Physical Length (m)',
    'Chamber Footprint Length (m)',
    'Upstream Face X_start (m)',
    'Downstream Face X_end (m)',
    'Asymmetric Chamber',
    'Show Footprint Box',
    'Show Footprint Text',
    'Show Label',
    'Locked',
    'Lock Length',
    'Lock Center',
    'Major Color',
    'Minor Color',
    'Clearance to Next (m)',
    'Next Component',
    'Elevation Y (mm)',
    'Lateral Offset Z (mm)',
    'Wall/Enclosure Width (m)',
    'Wall/Enclosure Height (m)',
    'Ray Color',
    'Ray Width',
    'Ray Style',
    'Show Ray Arrow',
    'Animate Ray',
    'Misc A',
    'Misc B',
    'Misc C',
    'Misc D',
    'Label Side X (px)',
    'Label Side Y (px)',
    'Label Top X (px)',
    'Label Top Y (px)',
    'Branch',
    'Enclosure / Section'
  ];

  const lines = [
    `# ${beamlineName} - Construction & Spatial Guide`,
    `# Generated: ${new Date().toLocaleString()}`,
    `# Total Beamline Length: ${scheduleData.canvasLength} m | Components: ${scheduleData.totalCount}`,
    headers.join(',')
  ];

  scheduleData.rows.forEach(r => {
    let status = 'OK';
    if (r.isOverlap) status = `WARNING: OVERLAP (${r.overlapAmount} m)`;
    else if (r.gapToNext !== null && r.gapToNext === 0) status = 'ABUTTING (0 m)';

    const item = r.item || {};
    const misc = r.misc || getItemMiscParams(item);

    // Wall/Enclosure Width & Height
    const wallW = ['WALL', 'HUTCH'].includes(r.type)
      ? (item.wallWidth !== undefined ? Number(item.wallWidth).toFixed(3) : (item.dimZ ? (item.dimZ / PX_PER_M).toFixed(3) : '7.000'))
      : (r.type === 'CHAMBER' ? (item.height !== undefined ? Number(item.height).toFixed(3) : (item.dimZ ? (item.dimZ / PX_PER_M).toFixed(3) : '3.000')) : '');
    const wallH = ['WALL', 'HUTCH'].includes(r.type)
      ? (item.wallHeight !== undefined ? Number(item.wallHeight).toFixed(3) : (item.height !== undefined ? Number(item.height).toFixed(3) : '7.000'))
      : (r.type === 'CHAMBER' ? (item.height !== undefined ? Number(item.height).toFixed(3) : (item.dimY ? (item.dimY / PX_PER_M).toFixed(3) : '3.000')) : '');

    // Source Ray Attributes
    const rayColor = item.type === 'SOURCE' ? (item.rayColor || '#ef4444') : '';
    const rayWidth = item.type === 'SOURCE' ? (item.rayWidth !== undefined ? Number(item.rayWidth).toFixed(1) : '1.5') : '';
    const rayStyle = item.type === 'SOURCE' ? (item.rayStyle || 'dashed') : '';
    const showRayArrow = item.type === 'SOURCE' ? (item.showArrow !== false ? 'YES' : 'NO') : '';
    const animateRay = item.type === 'SOURCE' ? (item.animate !== false ? 'YES' : 'NO') : '';

    // Label offset coordinates: only export non-empty numbers if explicitly customized, otherwise export empty so import does not force labels into center
    const labelSideXStr = item.labelOffsets?.SIDE?.x !== undefined ? Number(item.labelOffsets.SIDE.x).toFixed(1) : '';
    const labelSideYStr = item.labelOffsets?.SIDE?.y !== undefined ? Number(item.labelOffsets.SIDE.y).toFixed(1) : '';
    const labelTopXStr = item.labelOffsets?.TOP?.x !== undefined ? Number(item.labelOffsets.TOP.x).toFixed(1) : '';
    const labelTopYStr = item.labelOffsets?.TOP?.y !== undefined ? Number(item.labelOffsets.TOP.y).toFixed(1) : '';

    const branchStr = (r.branch === 'diffracted' || item.branch === 'diffracted')
      ? 'Diffracted'
      : ((r.branch === 'straight' || item.branch === 'straight') ? 'Straight' : '');

    const row = [
      r.index,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      r.type,
      r.dist.toFixed(3),
      (r.physLength ?? r.length).toFixed(3),
      r.length.toFixed(3),
      r.start.toFixed(3),
      r.end.toFixed(3),
      r.freeDownstream ? 'YES' : 'NO',
      r.showFootprint ? 'YES' : 'NO',
      r.showFootprintText ? 'YES' : 'NO',
      item.showLabel !== false ? 'YES' : 'NO',
      r.isLocked ? 'YES' : 'NO',
      item.lockLength ? 'YES' : 'NO',
      item.lockCenter ? 'YES' : 'NO',
      `"${String(item.primaryColor || '').replace(/"/g, '""')}"`,
      `"${String(item.secondaryColor || '').replace(/"/g, '""')}"`,
      r.gapToNext !== null ? r.gapToNext.toFixed(3) : 'N/A',
      `"${(r.nextItemName || '').replace(/"/g, '""')}"`,
      ['WALL', 'HUTCH'].includes(r.type) ? '-' : (r.heightMm !== null && r.heightMm !== undefined ? Number(r.heightMm).toFixed(1) : (r.height !== null && r.height !== undefined && !isNaN(Number(r.height)) ? Number(r.height).toFixed(1) : '-')),
      ['WALL', 'HUTCH'].includes(r.type) ? '-' : (r.offsetMm !== null && r.offsetMm !== undefined ? Number(r.offsetMm).toFixed(1) : (r.offset !== null && r.offset !== undefined && !isNaN(Number(r.offset)) ? Number(r.offset).toFixed(1) : '-')),
      wallW,
      wallH,
      `"${rayColor.replace(/"/g, '""')}"`,
      rayWidth,
      `"${rayStyle.replace(/"/g, '""')}"`,
      showRayArrow,
      animateRay,
      `"${String(misc.miscA ?? '').replace(/"/g, '""')}"`,
      `"${String(misc.miscB ?? '').replace(/"/g, '""')}"`,
      `"${String(misc.miscC ?? '').replace(/"/g, '""')}"`,
      `"${String(misc.miscD ?? '').replace(/"/g, '""')}"`,
      labelSideXStr,
      labelSideYStr,
      labelTopXStr,
      labelTopYStr,
      `"${branchStr}"`,
      `"${(r.enclosureName || '').replace(/"/g, '""')}"`
    ];
    lines.push(row.join(','));
  });

  return lines.join('\n');
};

/**
 * Parses CSV text to construct beamline layout items.
 */
export const parseCsvToItems = (csvText) => {
  if (!csvText || typeof csvText !== 'string') return [];
  const rawLines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  let headerIndex = -1;
  for (let i = 0; i < rawLines.length; i++) {
    if (!rawLines[i].startsWith('#')) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) return [];

  const parseCsvRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCsvRow(rawLines[headerIndex]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const getCol = (...aliases) => {
    for (const a of aliases) {
      const clean = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      const idx = headers.indexOf(clean);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameIdx = getCol('componentname', 'name', 'tag');
  const typeIdx = getCol('type', 'componenttype');
  const posXIdx = getCol('centerpositionxm', 'centerpositionx', 'distance', 'centerx', 'positionx');
  const physLenIdx = getCol('opticsphysicallengthm', 'physicallengthm', 'physicallength', 'opticlength');
  const boxLenIdx = getCol('chamberfootprintlengthm', 'chamberlengthm', 'footprintlengthm', 'footprintlength', 'length');
  const startIdx = getCol('upstreamfacexstartm', 'upstreamfacexstart', 'xstart', 'upstream', 'start');
  const endIdx = getCol('downstreamfacexendm', 'downstreamfacexend', 'xend', 'downstream', 'end');
  const asymIdx = getCol('asymmetricchamber', 'asymmetric', 'freedownstream');
  const showFootprintIdx = getCol('showfootprintbox', 'showfootprint', 'footprint');
  const showFootprintTextIdx = getCol('showfootprinttext', 'footprinttext');
  const showLabelIdx = getCol('showlabel', 'labelvisible', 'label');
  const lockedIdx = getCol('locked', 'islocked');
  const lockLengthIdx = getCol('locklength', 'islocklength');
  const lockCenterIdx = getCol('lockcenter', 'islockcenter');
  const primaryColorIdx = getCol('majorcolor', 'primarycolor', 'color1', 'color');
  const secondaryColorIdx = getCol('minorcolor', 'secondarycolor', 'color2');
  const elevYIdx = getCol('elevationymm', 'elevationym', 'elevationy', 'height', 'y');
  const latZIdx = getCol('lateraloffsetzmm', 'lateraloffsetzm', 'lateraloffsetz', 'offset', 'z');
  const wallWidthIdx = getCol('wallenclosurewidthm', 'wallenclosurewidth', 'wallwidthm', 'wallwidth', 'width');
  const wallHeightIdx = getCol('wallenclosureheightm', 'wallenclosureheight', 'wallheightm', 'wallheight');
  const rayColorIdx = getCol('raycolor', 'beamcolor');
  const rayWidthIdx = getCol('raywidth', 'beamwidth');
  const rayStyleIdx = getCol('raystyle', 'linestyle');
  const showRayArrowIdx = getCol('showrayarrow', 'showarrow', 'drawdirectionalarrows', 'arrow');
  const animateRayIdx = getCol('animateray', 'animate', 'animateraypath');
  const miscAIdx = getCol('misca');
  const miscBIdx = getCol('miscb');
  const miscCIdx = getCol('miscc');
  const miscDIdx = getCol('miscd', 'substratethkm', 'substratethk', 'thicknessm');
  const labelSideXIdx = getCol('labelsidexpx', 'labelsidex', 'labelsidex_px');
  const labelSideYIdx = getCol('labelsideypx', 'labelsidey', 'labelsidey_px');
  const labelTopXIdx = getCol('labeltopxpx', 'labeltopx', 'labeltopx_px');
  const labelTopYIdx = getCol('labeltopypx', 'labeltopy', 'labeltopy_px');
  const labelXIdx = getCol('labeloffsetxpx', 'labeloffsetx', 'labelx');
  const labelYIdx = getCol('labeloffsetypx', 'labeloffsety', 'labely');
  const branchIdx = getCol('branch', 'raybranch');

  const items = [];
  const now = Date.now();

  for (let i = headerIndex + 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (line.startsWith('#')) continue;
    const cols = parseCsvRow(line);
    if (cols.length < 3) continue;

    const rawType = (typeIdx !== -1 && cols[typeIdx]) ? cols[typeIdx].toUpperCase() : '';
    const compType = Object.keys(TYPES).find(t => t === rawType) || 'SLIT';
    const conf = TYPES[compType] || { defaultLength: 1.0, width: 20 };
    const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(compType);
    const isSource = compType === 'SOURCE';

    const name = (nameIdx !== -1 && cols[nameIdx]) ? cols[nameIdx] : conf.name;
    const dist = posXIdx !== -1 && !isNaN(parseFloat(cols[posXIdx])) ? parseFloat(cols[posXIdx]) : 0;
    
    const rawDetectorType = (compType === 'DETECTOR' && miscAIdx !== -1 && cols[miscAIdx]) ? cols[miscAIdx].trim() : '';
    const isAnchorType = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(compType);
    const isVirtualAnchor = isAnchorType || (compType === 'DETECTOR' && rawDetectorType === 'Virtual Anchor');

    let physLen = conf.defaultLength || (isAnchorType ? 0 : 1.0);
    if (isVirtualAnchor) {
      physLen = 0;
    } else if (physLenIdx !== -1 && !isNaN(parseFloat(cols[physLenIdx]))) {
      const parsed = parseFloat(cols[physLenIdx]);
      physLen = ((isAnchorType || compType === 'DETECTOR') && parsed === 0) ? 0 : Math.max(0.01, parsed);
    } else if (boxLenIdx !== -1 && !isNaN(parseFloat(cols[boxLenIdx]))) {
      const parsed = parseFloat(cols[boxLenIdx]);
      physLen = ((isAnchorType || compType === 'DETECTOR') && parsed === 0) ? 0 : Math.max(0.01, parsed);
    }

    let startVal, endVal;
    if (startIdx !== -1 && !isNaN(parseFloat(cols[startIdx]))) {
      startVal = parseFloat(cols[startIdx]);
    }
    if (endIdx !== -1 && !isNaN(parseFloat(cols[endIdx]))) {
      endVal = parseFloat(cols[endIdx]);
    }

    if (startVal === undefined || endVal === undefined) {
      if (isVirtualAnchor) {
        startVal = dist;
        endVal = dist;
      } else if (isSource) {
        endVal = dist;
        startVal = parseFloat((dist - physLen).toFixed(3));
      } else if (['VDCM', 'HDCM'].includes(compType)) {
        startVal = parseFloat((dist - 0.5).toFixed(3));
        endVal = parseFloat((dist + 0.7).toFixed(3));
      } else {
        const boxLen = (boxLenIdx !== -1 && !isNaN(parseFloat(cols[boxLenIdx])))
          ? parseFloat(cols[boxLenIdx])
          : (isRange ? physLen : Math.max(physLen, physLen + 0.6));
        startVal = parseFloat((dist - boxLen / 2).toFixed(3));
        endVal = parseFloat((dist + boxLen / 2).toFixed(3));
      }
    }

    const freeDownstream = asymIdx !== -1 ? ['yes', 'true', '1'].includes(cols[asymIdx]?.toLowerCase()) : false;
    const showFootprint = showFootprintIdx !== -1 ? ['yes', 'true', '1'].includes(cols[showFootprintIdx]?.toLowerCase()) : false;
    const showFootprintText = showFootprintTextIdx !== -1 ? ['yes', 'true', '1'].includes(cols[showFootprintTextIdx]?.toLowerCase()) : false;
    const showLabel = showLabelIdx !== -1 ? !['no', 'false', '0'].includes(cols[showLabelIdx]?.toLowerCase()) : true;
    const isLocked = lockedIdx !== -1 ? ['yes', 'true', '1'].includes(cols[lockedIdx]?.toLowerCase()) : false;
    const lockLength = lockLengthIdx !== -1 ? ['yes', 'true', '1'].includes(cols[lockLengthIdx]?.toLowerCase()) : false;
    const lockCenter = lockCenterIdx !== -1 ? ['yes', 'true', '1'].includes(cols[lockCenterIdx]?.toLowerCase()) : false;

    const primaryColor = (primaryColorIdx !== -1 && cols[primaryColorIdx]) ? cols[primaryColorIdx].trim() : undefined;
    const secondaryColor = (secondaryColorIdx !== -1 && cols[secondaryColorIdx]) ? cols[secondaryColorIdx].trim() : undefined;

    const isElevMmHeader = elevYIdx !== -1 && Boolean(headers[elevYIdx]?.includes('mm'));
    const isLatMmHeader = latZIdx !== -1 && Boolean(headers[latZIdx]?.includes('mm'));

    const rawHeightStr = elevYIdx !== -1 ? cols[elevYIdx]?.trim() : '';
    const rawOffsetStr = latZIdx !== -1 ? cols[latZIdx]?.trim() : '';

    const isElevDash = rawHeightStr === '-' || rawHeightStr === '';
    const isOffsetDash = rawOffsetStr === '-' || rawOffsetStr === '';

    const parsedHeight = !isElevDash && !isNaN(parseFloat(rawHeightStr)) ? parseFloat(rawHeightStr) : 0;
    const parsedOffset = !isOffsetDash && !isNaN(parseFloat(rawOffsetStr)) ? parseFloat(rawOffsetStr) : 0;

    let h_mm = 0;
    if (!isElevDash) {
      if (['WALL', 'HUTCH', 'CHAMBER'].includes(compType)) {
        h_mm = isElevMmHeader ? parsedHeight : parsedHeight * 1000;
      } else {
        h_mm = isElevMmHeader ? parsedHeight : parsedHeight * 1000;
      }
    }

    let o_mm = 0;
    if (!isOffsetDash) {
      o_mm = isLatMmHeader ? parsedOffset : parsedOffset * 1000;
    }

    let wallW = (wallWidthIdx !== -1 && !isNaN(parseFloat(cols[wallWidthIdx])))
      ? parseFloat(cols[wallWidthIdx])
      : (['WALL', 'HUTCH'].includes(compType) && miscAIdx !== -1 && !isNaN(parseFloat(cols[miscAIdx]))
          ? parseFloat(cols[miscAIdx])
          : (conf.height ? conf.height / PX_PER_M : 7.0));

    let wallH = (wallHeightIdx !== -1 && !isNaN(parseFloat(cols[wallHeightIdx])))
      ? parseFloat(cols[wallHeightIdx])
      : (['WALL', 'HUTCH'].includes(compType) && miscBIdx !== -1 && !isNaN(parseFloat(cols[miscBIdx]))
          ? parseFloat(cols[miscBIdx])
          : ((!isElevDash && parsedHeight > 0) ? (isElevMmHeader ? parsedHeight / 1000 : parsedHeight) : (conf.height ? conf.height / PX_PER_M : 7.0)));

    const chamberH = wallHeightIdx !== -1 && !isNaN(parseFloat(cols[wallHeightIdx]))
      ? parseFloat(cols[wallHeightIdx])
      : ((!isElevDash && parsedHeight > 0) ? (isElevMmHeader ? parsedHeight / 1000 : parsedHeight) : (compType === 'CHAMBER' && miscAIdx !== -1 && !isNaN(parseFloat(cols[miscAIdx])) ? parseFloat(cols[miscAIdx]) : (conf.height / PX_PER_M || 3.0)));

    // Sizing and positioning calculations
    let dimX, dimY, dimZ, x, y, z, actualDistance;
    if (['WALL', 'HUTCH'].includes(compType)) {
      dimX = Math.abs(endVal - startVal) * PX_PER_M;
      dimY = wallH * PX_PER_M;
      dimZ = wallW * PX_PER_M;
      actualDistance = parseFloat(((startVal + endVal) / 2).toFixed(3));
      x = ORIGIN_X + actualDistance * PX_PER_M;
      y = 200 - (wallH * PX_PER_M) / 2;
      z = 150;
    } else if (compType === 'CHAMBER') {
      dimX = Math.abs(endVal - startVal) * PX_PER_M;
      dimY = chamberH * PX_PER_M;
      dimZ = chamberH * PX_PER_M;
      actualDistance = parseFloat(((startVal + endVal) / 2).toFixed(3));
      x = ORIGIN_X + actualDistance * PX_PER_M;
      y = 150 - chamberH * PX_PER_M;
      z = 150 + o_mm * PX_PER_MM_V;
    } else if (isSource) {
      dimX = physLen * PX_PER_M;
      dimY = conf.height;
      dimZ = 30; // 1.5 units (1.5 * 20px = 30px)
      actualDistance = dist;
      x = ORIGIN_X + dist * PX_PER_M;
      y = 150 - h_mm * PX_PER_MM_V;
      z = 150 + o_mm * PX_PER_MM_V;
    } else if (['VDCM', 'HDCM'].includes(compType)) {
      const boxLen = parseFloat(Math.abs(endVal - startVal).toFixed(3));
      dimX = boxLen * PX_PER_M;
      dimY = conf.height;
      dimZ = conf.height;
      actualDistance = dist;
      x = ORIGIN_X + dist * PX_PER_M;
      y = 150 - h_mm * PX_PER_MM_V;
      z = 150 + o_mm * PX_PER_MM_V;
    } else if (['VFM', 'HFM'].includes(compType)) {
      dimX = physLen * PX_PER_M;
      dimY = undefined;
      dimZ = undefined;
      actualDistance = dist;
      x = ORIGIN_X + dist * PX_PER_M;
      y = 150 - h_mm * PX_PER_MM_V;
      z = 150 + o_mm * PX_PER_MM_V;
    } else {
      dimX = physLen * PX_PER_M;
      dimY = conf.height;
      dimZ = (compType === 'SOURCE') ? 30 : conf.height;
      actualDistance = dist;
      x = ORIGIN_X + dist * PX_PER_M;
      y = 150 - h_mm * PX_PER_MM_V;
      z = 150 + o_mm * PX_PER_MM_V;
    }

    const rawBranch = (branchIdx !== -1 && cols[branchIdx]) ? cols[branchIdx].trim().toLowerCase() : '';
    let branch = undefined;
    if (rawBranch.includes('diffract')) branch = 'diffracted';
    else if (rawBranch.includes('straight')) branch = 'straight';

    let item = {
      id: `imported_${now}_${i}`,
      type: compType,
      customName: name,
      name: name,
      ...(branch ? { branch } : {}),
      distance: actualDistance,
      physicalLength: physLen,
      length: physLen,
      chamberLength: parseFloat(Math.abs(endVal - startVal).toFixed(3)),
      start: startVal,
      end: endVal,
      freeDownstream,
      showFootprint,
      showFootprintText,
      showLabel,
      isLocked,
      lockLength,
      lockCenter,
      height: compType === 'CHAMBER' ? chamberH : (['WALL', 'HUTCH'].includes(compType) ? wallH : (isElevDash ? 0 : h_mm)),
      offset: isOffsetDash ? 0 : o_mm,
      wallWidth: wallW,
      wallHeight: wallH,
      dimX,
      dimY,
      dimZ,
      x,
      y,
      z
    };

    if (primaryColor) item.primaryColor = primaryColor;
    if (secondaryColor) item.secondaryColor = secondaryColor;

    // Apply miscellaneous parameters
    if (miscAIdx !== -1 && cols[miscAIdx] !== undefined && cols[miscAIdx] !== '') {
      // For VFM/HFM, do not let legacy miscA override the dedicated Optics Physical Length column
      if (!['VFM', 'HFM'].includes(compType) || physLenIdx === -1 || isNaN(parseFloat(cols[physLenIdx]))) {
        item = setItemMiscParam(item, 'miscA', cols[miscAIdx]);
      }
    }
    if (miscBIdx !== -1 && cols[miscBIdx] !== undefined && cols[miscBIdx] !== '') {
      item = setItemMiscParam(item, 'miscB', cols[miscBIdx]);
    }
    if (miscCIdx !== -1 && cols[miscCIdx] !== undefined && cols[miscCIdx] !== '') {
      item = setItemMiscParam(item, 'miscC', cols[miscCIdx]);
    }
    if (miscDIdx !== -1 && cols[miscDIdx] !== undefined && cols[miscDIdx] !== '') {
      item = setItemMiscParam(item, 'miscD', cols[miscDIdx]);
    }

    // Mirror specifics (VFM / HFM): ensure proper physicalLength, substrateThickness and faceHeight
    if (['VFM', 'HFM'].includes(compType)) {
      // The dedicated Optics Physical Length column (physLen) is the authoritative source of truth!
      item.physicalLength = physLen;
      item.length = physLen;
      item.dimX = physLen * PX_PER_M;
      delete item.physicalDistance;
      delete item.mirrorLength;
      const parsedTh = miscDIdx !== -1 && cols[miscDIdx] && !isNaN(parseFloat(cols[miscDIdx])) && parseFloat(cols[miscDIdx]) > 0
        ? parseFloat(cols[miscDIdx])
        : (item.substrateThickness ?? 0.3);
      item.substrateThickness = parsedTh;
      item.faceHeight = item.faceHeight ?? 1.0;
      delete item.dimY;
      delete item.dimZ;
    }

    // Anchor & Virtual Anchor specifics
    if (isAnchorType || (compType === 'DETECTOR' && (item.detectorType === 'Virtual Anchor' || isVirtualAnchor))) {
      item.type = isAnchorType ? compType : 'DETECTOR';
      item.passLight = true;
      item.stayInPath = false;
      item.length = 0;
      item.physicalLength = 0;
      item.showFootprint = false;
      item.showLabel = false;
      item.start = dist;
      item.end = dist;
    }

    // Source Ray Specifics: protect physicalLength, start, and end from being overwritten by misc params
    if (isSource) {
      if (physLenIdx !== -1 && !isNaN(parseFloat(cols[physLenIdx]))) {
        item.physicalLength = physLen;
        item.length = physLen;
        item.dimX = physLen * PX_PER_M;
        if (startVal !== undefined) item.start = startVal;
        if (endVal !== undefined) item.end = endVal;
      }
      if (rayColorIdx !== -1 && cols[rayColorIdx]) item.rayColor = cols[rayColorIdx].trim();
      if (rayWidthIdx !== -1 && !isNaN(parseFloat(cols[rayWidthIdx]))) item.rayWidth = parseFloat(cols[rayWidthIdx]);
      if (rayStyleIdx !== -1 && cols[rayStyleIdx]) item.rayStyle = cols[rayStyleIdx].trim();
      else if (item.rayStyle === undefined && item.miscD) item.rayStyle = item.miscD;
      if (showRayArrowIdx !== -1 && cols[showRayArrowIdx]) item.showArrow = !['no', 'false', '0'].includes(cols[showRayArrowIdx].toLowerCase());
      if (animateRayIdx !== -1 && cols[animateRayIdx]) item.animate = !['no', 'false', '0'].includes(cols[animateRayIdx].toLowerCase());
    }

    // Ensure branch is maintained
    if (branch) item.branch = branch;

    // Label Offset Coordinates Handling
    // Safely parse so default labels are not pushed into component center
    const parseLabelCoord = (colVal) => {
      if (colVal === undefined || colVal === null || colVal === '') return undefined;
      const n = parseFloat(colVal);
      if (isNaN(n)) return undefined;
      return n;
    };
    const sX = labelSideXIdx !== -1 ? parseLabelCoord(cols[labelSideXIdx]) : undefined;
    const sY = labelSideYIdx !== -1 ? parseLabelCoord(cols[labelSideYIdx]) : undefined;
    const tX = labelTopXIdx !== -1 ? parseLabelCoord(cols[labelTopXIdx]) : undefined;
    const tY = labelTopYIdx !== -1 ? parseLabelCoord(cols[labelTopYIdx]) : undefined;

    // Only set labelOffsets if explicitly defined in CSV (empty means default placement)
    if (sX !== undefined || sY !== undefined) {
      item.labelOffsets = item.labelOffsets || {};
      item.labelOffsets.SIDE = { ...(item.labelOffsets.SIDE || {}) };
      if (sX !== undefined) item.labelOffsets.SIDE.x = sX;
      if (sY !== undefined) item.labelOffsets.SIDE.y = sY;
    }
    if (tX !== undefined || tY !== undefined) {
      item.labelOffsets = item.labelOffsets || {};
      item.labelOffsets.TOP = { ...(item.labelOffsets.TOP || {}) };
      if (tX !== undefined) item.labelOffsets.TOP.x = tX;
      if (tY !== undefined) item.labelOffsets.TOP.y = tY;
    }

    if (['VDCM', 'HDCM'].includes(compType)) {
      const chLen = item.chamberLength !== undefined ? parseFloat(item.chamberLength) : 1.2;
      item.dimX = chLen * PX_PER_M;
      item.length = chLen;
      item.physicalLength = chLen;
      item.chamberLength = chLen;
    }

    items.push(item);
  }

  return items;
};

/**
 * Triggers browser download of CSV file.
 */
export const downloadCsv = (dataOrItems, filename = 'beamline_construction_schedule.csv', canvasLength = 50) => {
  const scheduleData = Array.isArray(dataOrItems)
    ? computeConstructionSchedule(dataOrItems, canvasLength)
    : (dataOrItems?.rows ? dataOrItems : computeConstructionSchedule(dataOrItems?.items || [], canvasLength));
  const csv = generateCsvContent(scheduleData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Escapes special characters for XML/SVG validity.
 */
export const escapeXml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Escapes characters that are illegal inside XML comments (<!-- ... -->).
 */
export const escapeXmlComment = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/--+/g, '-')
    .replace(/[<>&]/g, '');
};

/**
 * Generates production-grade vector CAD SVG with semantic layer groups,
 * metric dimensions, clearance callouts, and ANSI title block.
 */
export const generateCadSvg = (items = [], options = {}) => {
  const {
    view = 'BOTH',            // 'TOP', 'SIDE', or 'BOTH'
    unit = 'mm',              // 'mm' (1m = 1000) or 'm' (1m = 100) or 'px' (1m = 20)
    canvasLength = 50,        // in meters
    beamlineName = 'BEAMLINE CONSTRUCTION LAYOUT & SPATIAL GUIDE',
    includeTitleBlock = true,
    includeClearance = true,
    includeDimensions = true,
    includeGrid = true,
    isDark = false
  } = options;

  const scale = unit === 'mm' ? 1000 : (unit === 'm' ? 100 : 20);
  const totalLengthUnits = canvasLength * scale;

  const leftMargin = 3000 * (scale / 1000);
  const rightMargin = 3000 * (scale / 1000);
  const topMargin = 2000 * (scale / 1000);
  const viewHeight = 4000 * (scale / 1000);
  const viewSpacing = 2500 * (scale / 1000);

  const showTop = view === 'TOP' || view === 'BOTH';
  const showSide = view === 'SIDE' || view === 'BOTH';
  const numViews = (showTop ? 1 : 0) + (showSide ? 1 : 0);

  const totalWidth = leftMargin + totalLengthUnits + rightMargin;
  const totalHeight = topMargin + numViews * viewHeight + (numViews > 1 ? viewSpacing : 0) + (includeTitleBlock ? 2500 * (scale / 1000) : 1500 * (scale / 1000));

  const bgColor = isDark ? '#090d16' : '#ffffff';
  const axisColor = isDark ? '#38bdf8' : '#0284c7';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const compColor = isDark ? '#f8fafc' : '#0f172a';
  const compFill = isDark ? '#1e293b' : '#f1f5f9';
  const textColor = isDark ? '#cbd5e1' : '#1e293b';
  const dimColor = isDark ? '#94a3b8' : '#475569';
  const gapColor = isDark ? '#10b981' : '#059669';
  const alertColor = '#dc2626';

  const schedule = computeConstructionSchedule(items, canvasLength);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 ${totalWidth} ${totalHeight}" 
     width="${totalWidth}" 
     height="${totalHeight}">
  <defs>
    <!-- CAD Dimension Arrowhead Markers -->
    <marker id="cad-arrow-start" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
      <path d="M 8 1 L 0 4 L 8 7 z" fill="${dimColor}" />
    </marker>
    <marker id="cad-arrow-end" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
      <path d="M 0 1 L 8 4 L 0 7 z" fill="${dimColor}" />
    </marker>
    <marker id="cad-gap-start" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
      <path d="M 8 1 L 0 4 L 8 7 z" fill="${gapColor}" />
    </marker>
    <marker id="cad-gap-end" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
      <path d="M 0 1 L 8 4 L 0 7 z" fill="${gapColor}" />
    </marker>
  </defs>

  <style>
    .cad-text { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: ${160 * (scale / 1000)}px; }
    .cad-title { font-family: 'Segoe UI', Arial, sans-serif; font-weight: bold; font-size: ${240 * (scale / 1000)}px; }
    .cad-dim { font-family: 'Consolas', 'Courier New', monospace; font-size: ${130 * (scale / 1000)}px; font-weight: bold; }
    .cad-gap { font-family: 'Consolas', 'Courier New', monospace; font-size: ${120 * (scale / 1000)}px; font-weight: bold; }
  </style>

  <!-- BACKGROUND -->
  <rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${bgColor}" />
`;

  let currentY = topMargin;

  const renderViewPlane = (vType, planeTitle) => {
    const originX = leftMargin;
    const centerY = currentY + viewHeight / 2;

    let group = `
  <!-- LAYER: ${escapeXmlComment(planeTitle)} (${vType}) -->
  <g id="VIEW_${vType}">
    <!-- VIEW HEADER -->
    <text x="${originX}" y="${currentY + 200 * (scale / 1000)}" fill="${axisColor}" class="cad-title">${escapeXml(planeTitle)}</text>
`;

    // 1. Metric Grid & Station Ruler
    if (includeGrid) {
      group += `    <!-- GRID AND TICKS -->\n`;
      for (let m = 0; m <= canvasLength; m += 1) {
        const xPos = originX + m * scale;
        const isMajor = m % 5 === 0;
        const strokeW = isMajor ? 2 * (scale / 1000) : 1 * (scale / 1000);
        const lineC = isMajor ? (isDark ? '#334155' : '#cbd5e1') : gridColor;

        group += `    <line x1="${xPos}" y1="${centerY - viewHeight * 0.4}" x2="${xPos}" y2="${centerY + viewHeight * 0.4}" stroke="${lineC}" stroke-width="${strokeW}" stroke-dasharray="${isMajor ? 'none' : '4,8'}" opacity="0.6" />\n`;
        if (isMajor || m === canvasLength) {
          group += `    <text x="${xPos}" y="${centerY + viewHeight * 0.44}" fill="${dimColor}" class="cad-dim" text-anchor="middle">${m} m</text>\n`;
        }
      }
    }

    // 2. Optical Centerline Axis
    group += `
    <!-- OPTICAL CENTERLINE AXIS -->
    <line x1="${originX - 500 * (scale / 1000)}" y1="${centerY}" x2="${originX + totalLengthUnits + 500 * (scale / 1000)}" y2="${centerY}" 
          stroke="${axisColor}" stroke-width="${3 * (scale / 1000)}" stroke-dasharray="30,10,10,10" />
    <text x="${originX - 600 * (scale / 1000)}" y="${centerY + 40 * (scale / 1000)}" fill="${axisColor}" class="cad-dim" text-anchor="end">BEAM AXIS (CL)</text>
`;

    // 3. Components
    group += `    <!-- COMPONENTS -->\n`;
    items.forEach(item => {
      const bounds = getItemBoundsM(item);
      const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
      const itemX = originX + bounds.start * scale;
      const itemW = Math.max(bounds.len * scale, 150 * (scale / 1000));
      
      let itemOffset = 0;
      if (vType === 'TOP') {
        itemOffset = (parseFloat(item.offset) || 0) * scale;
      } else {
        itemOffset = -(parseFloat(item.height) || 0) * scale;
      }
      const itemY = centerY + itemOffset;

      const compHeightUnits = isRange 
        ? (viewHeight * 0.6) 
        : (['VFM', 'HFM', 'SOURCE'].includes(item.type)
          ? ((getItemVisualHeight(item, vType) / PX_PER_M) * scale)
          : (TYPES[item.type]?.height ? (TYPES[item.type].height / PX_PER_M) * scale : 400 * (scale / 1000)));

      const rawLabel = item.customName || TYPES[item.type]?.name || item.type;
      const safeCommentLabel = escapeXmlComment(rawLabel);
      const safeXmlLabel = escapeXml(rawLabel);

      if (item.type === 'HUTCH' || item.type === 'CHAMBER') {
        group += `    <!-- ${safeCommentLabel} -->\n`;
        group += `    <rect x="${itemX}" y="${centerY - compHeightUnits / 2}" width="${itemW}" height="${compHeightUnits}" 
                    fill="${isDark ? 'rgba(56,189,248,0.06)' : 'rgba(2,132,199,0.04)'}" 
                    stroke="${axisColor}" stroke-width="${2 * (scale / 1000)}" stroke-dasharray="10,6" rx="4" />\n`;
        group += `    <text x="${itemX + 100 * (scale / 1000)}" y="${centerY - compHeightUnits / 2 + 220 * (scale / 1000)}" fill="${axisColor}" class="cad-dim">${safeXmlLabel}</text>\n`;
      } else if (item.type === 'WALL') {
        group += `    <!-- ${safeCommentLabel} -->\n`;
        group += `    <rect x="${itemX}" y="${centerY - compHeightUnits / 2}" width="${itemW}" height="${compHeightUnits}" 
                    fill="${isDark ? '#334155' : '#94a3b8'}" stroke="${compColor}" stroke-width="${2 * (scale / 1000)}" />\n`;
        group += `    <text x="${itemX + itemW / 2}" y="${centerY - compHeightUnits / 2 - 80 * (scale / 1000)}" fill="${textColor}" class="cad-dim" text-anchor="middle">${safeXmlLabel}</text>\n`;
      } else {
        group += `    <!-- ${safeCommentLabel} -->\n`;
        group += `    <rect x="${itemX}" y="${itemY - compHeightUnits / 2}" width="${itemW}" height="${compHeightUnits}" 
                    fill="${compFill}" stroke="${compColor}" stroke-width="${2 * (scale / 1000)}" rx="2" />\n`;

        group += `    <text x="${itemX + itemW / 2}" y="${itemY - compHeightUnits / 2 - 120 * (scale / 1000)}" 
                    fill="${textColor}" class="cad-text" font-weight="bold" text-anchor="middle">${safeXmlLabel}</text>\n`;
        group += `    <text x="${itemX + itemW / 2}" y="${itemY + compHeightUnits / 2 + 180 * (scale / 1000)}" 
                    fill="${dimColor}" class="cad-dim" text-anchor="middle">${bounds.dist.toFixed(2)} m (L=${bounds.len}m)</text>\n`;
      }
    });

    // 4. Dimensions & Clearances
    if (includeDimensions) {
      group += `    <!-- DIMENSIONS AND CLEARANCES -->\n`;
      const optRows = schedule.opticalRows;
      const dimLineY = centerY + viewHeight * 0.32;

      optRows.forEach((row, i) => {
        const itemEnd = originX + row.end * scale;

        group += `    <line x1="${originX + row.dist * scale}" y1="${centerY + 400 * (scale / 1000)}" x2="${originX + row.dist * scale}" y2="${dimLineY}" stroke="${dimColor}" stroke-width="${1 * (scale / 1000)}" stroke-dasharray="3,3" />\n`;

        if (includeClearance && i < optRows.length - 1) {
          const nextRow = optRows[i + 1];
          const nextStart = originX + nextRow.start * scale;
          const gap = nextRow.start - row.end;
          const gapY = centerY - viewHeight * 0.32;

          if (gap > 0.05) {
            group += `    <line x1="${itemEnd}" y1="${gapY}" x2="${nextStart}" y2="${gapY}" stroke="${gapColor}" stroke-width="${2 * (scale / 1000)}" marker-start="url(#cad-gap-start)" marker-end="url(#cad-gap-end)" />\n`;
            group += `    <text x="${(itemEnd + nextStart) / 2}" y="${gapY - 60 * (scale / 1000)}" fill="${gapColor}" class="cad-gap" text-anchor="middle">GAP: ${gap.toFixed(3)} m</text>\n`;
          } else if (gap < -0.01) {
            group += `    <line x1="${itemEnd}" y1="${gapY}" x2="${nextStart}" y2="${gapY}" stroke="${alertColor}" stroke-width="${3 * (scale / 1000)}" />\n`;
            group += `    <text x="${(itemEnd + nextStart) / 2}" y="${gapY - 60 * (scale / 1000)}" fill="${alertColor}" class="cad-gap" text-anchor="middle">OVERLAP: ${Math.abs(gap).toFixed(3)} m</text>\n`;
          }
        }
      });
    }

    group += `  </g>\n`;
    currentY += viewHeight + viewSpacing;
    return group;
  };

  if (showSide) {
    svg += renderViewPlane('SIDE', 'ELEVATION VIEW (SIDE - Y vs X)');
  }
  if (showTop) {
    svg += renderViewPlane('TOP', 'PLAN VIEW (TOP - Z vs X)');
  }

  // TITLE BLOCK (Engineering Blueprint Header)
  if (includeTitleBlock) {
    const tbX = totalWidth - rightMargin - 4200 * (scale / 1000);
    const tbY = totalHeight - 2200 * (scale / 1000);
    const tbW = 4200 * (scale / 1000);
    const tbH = 1800 * (scale / 1000);

    const safeTitle = escapeXml(beamlineName || 'BEAMLINE CONSTRUCTION LAYOUT');
    const safeStatus = schedule.hasOverlaps 
      ? `STATUS: [WARNING] ${schedule.overlaps.length} OVERLAP(S) DETECTED` 
      : 'STATUS: ALL CLEARANCES VERIFIED';

    svg += `
  <!-- LAYER: TITLE BLOCK -->
  <g id="LAYER_TITLE_BLOCK">
    <rect x="${tbX}" y="${tbY}" width="${tbW}" height="${tbH}" fill="${compFill}" stroke="${compColor}" stroke-width="${3 * (scale / 1000)}" />
    <line x1="${tbX}" y1="${tbY + 500 * (scale / 1000)}" x2="${tbX + tbW}" y2="${tbY + 500 * (scale / 1000)}" stroke="${compColor}" stroke-width="${2 * (scale / 1000)}" />
    <line x1="${tbX}" y1="${tbY + 1100 * (scale / 1000)}" x2="${tbX + tbW}" y2="${tbY + 1100 * (scale / 1000)}" stroke="${compColor}" stroke-width="${1.5 * (scale / 1000)}" />
    <line x1="${tbX + tbW * 0.6}" y1="${tbY + 500 * (scale / 1000)}" x2="${tbX + tbW * 0.6}" y2="${tbY + tbH}" stroke="${compColor}" stroke-width="${1.5 * (scale / 1000)}" />

    <text x="${tbX + 200 * (scale / 1000)}" y="${tbY + 340 * (scale / 1000)}" fill="${textColor}" class="cad-title">${safeTitle}</text>
    <text x="${tbX + 200 * (scale / 1000)}" y="${tbY + 740 * (scale / 1000)}" fill="${dimColor}" class="cad-dim">DRAWING: BEAMLINE CONSTRUCTION LAYOUT</text>
    <text x="${tbX + 200 * (scale / 1000)}" y="${tbY + 960 * (scale / 1000)}" fill="${dimColor}" class="cad-dim">LENGTH: ${canvasLength} m | COMPONENTS: ${schedule.totalCount}</text>
    <text x="${tbX + 200 * (scale / 1000)}" y="${tbY + 1380 * (scale / 1000)}" fill="${dimColor}" class="cad-dim">CLEAR SPACE: ${schedule.freeBeamlineSpace} m (${(100 - schedule.spaceUtilization).toFixed(1)}% FREE)</text>
    <text x="${tbX + 200 * (scale / 1000)}" y="${tbY + 1600 * (scale / 1000)}" fill="${schedule.hasOverlaps ? alertColor : gapColor}" class="cad-dim">${escapeXml(safeStatus)}</text>

    <text x="${tbX + tbW * 0.63}" y="${tbY + 740 * (scale / 1000)}" fill="${dimColor}" class="cad-dim">UNIT: ${escapeXml(unit.toUpperCase())}</text>
    <text x="${tbX + tbW * 0.63}" y="${tbY + 960 * (scale / 1000)}" fill="${dimColor}" class="cad-dim">DATE: ${new Date().toISOString().split('T')[0]}</text>
    <text x="${tbX + tbW * 0.63}" y="${tbY + 1380 * (scale / 1000)}" fill="${dimColor}" class="cad-dim">REV: A0.1</text>
    <text x="${tbX + tbW * 0.63}" y="${tbY + 1600 * (scale / 1000)}" fill="${dimColor}" class="cad-dim">SHEET: 1 OF 1</text>
  </g>
`;
  }

  svg += `</svg>`;
  return svg;
};

/**
 * Triggers browser download of CAD SVG file.
 */
export const downloadCadSvg = (svgString, filename = 'beamline_layout_cad_guide.svg') => {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
