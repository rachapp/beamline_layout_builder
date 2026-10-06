import { TYPES, PX_PER_M, PX_PER_MM_V, BEAM_AXIS_PX, isAnchorType, isRangeType, isWallType } from '../constants/index.js';
import { getItemBoundsM } from './geometry.js';
import { getItemMiscParams, getMiscParamLabels } from './miscParams.js';

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

  const enclosures = sorted.filter(i => isRangeType(i.type));
  const opticalItems = sorted.filter(i => !isRangeType(i.type));

  const overlaps = [];
  let totalOpticalLength = 0;

  // Process all items
  const schedule = sorted.map((item, idx) => {
    const bounds = getItemBoundsM(item);
    const isAnchorItem = isAnchorType(item.type);
    const isVirtualAnchor = isAnchorItem || item.detectorType === 'Virtual Anchor' || item.isInvisible;
    const isOptical = !isRangeType(item.type) && !isVirtualAnchor;
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
          if (isAnchorType(i.type) || i.detectorType === 'Virtual Anchor' || i.isInvisible || i.type === 'HUTCH') return false;
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
      height: isWallType(item.type)
        ? (item.wallHeight !== undefined ? parseFloat(item.wallHeight) : (item.height !== undefined ? parseFloat(item.height) : 7.0))
        : (item.type === 'CHAMBER'
          ? (item.height !== undefined ? parseFloat(item.height) : (item.dimY ? parseFloat((item.dimY / PX_PER_M).toFixed(3)) : 3.0))
          : ((item.type === 'SOURCE' || isAnchorItem || (item.type === 'DETECTOR' && item.stayInPath === false))
            ? (item.height !== undefined && item.height !== null && !isNaN(Number(item.height))
                ? parseFloat(Number(item.height).toFixed(1))
                : (item.y !== undefined ? parseFloat(((BEAM_AXIS_PX - item.y) / PX_PER_MM_V).toFixed(1)) : 0))
            : (item.y !== undefined ? parseFloat(((BEAM_AXIS_PX - item.y) / PX_PER_MM_V).toFixed(1)) : (item.height !== undefined ? parseFloat(Number(item.height).toFixed(1)) : 0)))),
      offset: isWallType(item.type)
        ? 0
        : ((item.type === 'SOURCE' || isAnchorItem || (item.type === 'DETECTOR' && item.stayInPath === false))
          ? (item.offset !== undefined && item.offset !== null && !isNaN(Number(item.offset))
              ? parseFloat(Number(item.offset).toFixed(1))
              : (item.z !== undefined ? parseFloat((((item.z) - BEAM_AXIS_PX) / PX_PER_MM_V).toFixed(1)) : 0))
          : (item.z !== undefined ? parseFloat((((item.z) - BEAM_AXIS_PX) / PX_PER_MM_V).toFixed(1)) : (item.offset !== undefined ? parseFloat(Number(item.offset).toFixed(1)) : 0))),
      heightMm: isWallType(item.type)
        ? null
        : ((item.type === 'SOURCE' || isAnchorItem || (item.type === 'DETECTOR' && item.stayInPath === false))
          ? (item.height !== undefined && item.height !== null && !isNaN(Number(item.height))
              ? parseFloat(Number(item.height).toFixed(1))
              : (item.y !== undefined ? parseFloat(((BEAM_AXIS_PX - item.y) / PX_PER_MM_V).toFixed(1)) : 0))
          : (item.y !== undefined ? parseFloat(((BEAM_AXIS_PX - item.y) / PX_PER_MM_V).toFixed(1)) : (item.height !== undefined ? parseFloat(Number(item.height).toFixed(1)) : 0))),
      offsetMm: isWallType(item.type)
        ? null
        : ((item.type === 'SOURCE' || isAnchorItem || (item.type === 'DETECTOR' && item.stayInPath === false))
          ? (item.offset !== undefined && item.offset !== null && !isNaN(Number(item.offset))
              ? parseFloat(Number(item.offset).toFixed(1))
              : (item.z !== undefined ? parseFloat((((item.z) - BEAM_AXIS_PX) / PX_PER_MM_V).toFixed(1)) : 0))
          : (item.z !== undefined ? parseFloat((((item.z) - BEAM_AXIS_PX) / PX_PER_MM_V).toFixed(1)) : (item.offset !== undefined ? parseFloat(Number(item.offset).toFixed(1)) : 0))),
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
      const isAnchorA = isAnchorType(opt.type) || opt.detectorType === 'Virtual Anchor' || opt.isInvisible;
      const isAnchorB = isAnchorType(nextOpt.type) || nextOpt.detectorType === 'Virtual Anchor' || nextOpt.isInvisible;
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
