import { PX_PER_M, BEAM_AXIS_PX, FLOOR_PX, isAnchorType, isWallType, isDcmType, isMirrorType, isSplitterType } from '../constants/index.js';

/**
 * Resolves component-specific miscellaneous parameters (Misc A, B, C, D)
 * and label offset position tracking.
 */
export const getItemMiscParams = (item, activeView) => {
  if (!item) return { miscA: '', miscB: '', miscC: '', miscD: '', labelX: 0, labelY: 0 };
  const type = item.type;
  let miscA = '', miscB = '', miscC = '', miscD = '';

  if (isDcmType(type)) {
    miscA = item.exitOffset ?? 25;
    miscB = item.braggAngle ?? 45;
    miscC = item.crystal1Length ?? 0.5;
    miscD = item.crystal2Length ?? 0.5;
  } else if (type === 'GRATING') {
    miscA = item.orientation || 'Vertical';
    miscB = item.diffractAngle ?? 15;
    miscC = item.tiltAngle ?? 0;
    miscD = item.miscD ?? '';
  } else if (isMirrorType(type)) {
    miscA = item.physicalLength ?? item.length ?? (item.dimX ? item.dimX / PX_PER_M : 1.0);
    miscB = item.grazingAngle ?? item.deflectAngle ?? 0;
    miscC = item.focalLength ?? '';
    miscD = item.substrateThickness !== undefined ? item.substrateThickness : (item.miscD !== undefined ? item.miscD : 0.3);
  } else if (type === 'SOURCE') {
    miscA = item.sourceType || 'Undulator';
    miscB = item.periodLength ?? 50;
    miscC = item.numPeriods ?? 40;
    miscD = item.rayStyle || 'dashed';
  } else if (isAnchorType(type)) {
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
  } else if (isWallType(type)) {
    miscA = item.wallWidth !== undefined ? item.wallWidth : (item.dimZ ? item.dimZ / PX_PER_M : 7.0);
    miscB = item.wallHeight !== undefined ? item.wallHeight : (item.height ?? 7.0);
    miscC = item.miscC ?? '';
    miscD = item.miscD ?? '';
  } else if (type === 'CHAMBER') {
    miscA = item.height !== undefined ? item.height : (item.dimY ? item.dimY / PX_PER_M : 3.0);
    miscB = item.miscB ?? '';
    miscC = item.miscC ?? '';
    miscD = item.miscD ?? '';
  } else if (isSplitterType(type)) {
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
  if (isDcmType(type)) {
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
  if (isMirrorType(type)) {
    return {
      miscA: 'Mirror Dist/Len (m)',
      miscB: 'Grazing/Deflect (°)',
      miscC: 'Focal Len (m)',
      miscD: 'Thickness (m)'
    };
  }
  if (isSplitterType(type)) {
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
  if (isAnchorType(type)) {
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
  if (isWallType(type)) {
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
    if (isWallType(type)) {
      const num = parseFloat(val) || 0;
      updated.wallWidth = num;
      updated.dimZ = num * PX_PER_M;
    }
    else if (type === 'CHAMBER') {
      const num = parseFloat(val) || 0;
      updated.height = num;
      updated.dimY = num * PX_PER_M;
      updated.dimZ = num * PX_PER_M;
      updated.y = BEAM_AXIS_PX - num * PX_PER_M;
    }
    else if (isDcmType(type)) {
      const num = parseFloat(val);
      const parsedVal = isNaN(num) ? (val === '' ? '' : 25) : (num > 0 && num <= 1.0 ? num * 100 : num);
      updated.exitOffset = parsedVal;
      const chLen = updated.chamberLength ?? 1.5;
      updated.dimX = chLen * PX_PER_M;
    }
    else if (type === 'GRATING') updated.orientation = val;
    else if (isMirrorType(type)) {
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
    else if (isSplitterType(type)) updated.tiltAngle = parseFloat(val) || 45;
    else if (type === 'DETECTOR') updated.detectorType = val;
    else if (type === 'SAMPLE') updated.passLight = ['yes', 'true', '1'].includes(String(val).toLowerCase());
    else updated.miscA = val;
  } else if (key === 'miscB') {
    if (isWallType(type)) {
      const num = parseFloat(val) || 0;
      updated.wallHeight = num;
      updated.height = num;
      updated.dimY = num * PX_PER_M;
      updated.y = FLOOR_PX - (num * PX_PER_M) / 2;
    }
    else if (isDcmType(type)) {
      const num = parseFloat(val);
      updated.braggAngle = isNaN(num) ? (val === '' ? '' : 45) : num;
      const chLen = updated.chamberLength ?? 2.5;
      updated.dimX = chLen * PX_PER_M;
    }
    else if (type === 'GRATING') updated.diffractAngle = parseFloat(val) || 0;
    else if (isMirrorType(type)) {
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
    else if (isSplitterType(type)) updated.diffractAngle = parseFloat(val) || 0.5;
    else if (type === 'DETECTOR') updated.passLight = ['yes', 'true', '1'].includes(String(val).toLowerCase());
    else updated.miscB = val;
  } else if (key === 'miscC') {
    if (isDcmType(type)) updated.crystal1Length = parseFloat(val) || 0;
    else if (type === 'GRATING') updated.tiltAngle = parseFloat(val) || 0;
    else if (isMirrorType(type)) updated.focalLength = parseFloat(val) || 0;
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
    if (isDcmType(type)) updated.crystal2Length = parseFloat(val) || 0;
    else if (isMirrorType(type)) {
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
