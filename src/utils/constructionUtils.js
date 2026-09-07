import { TYPES, PX_PER_M, ORIGIN_X } from '../constants/index.js';

/**
 * Calculates physical length of an item in meters.
 */
export const getItemLengthM = (item) => {
  if (['WALL', 'HUTCH', 'CHAMBER'].includes(item.type)) {
    if (item.start !== undefined && item.end !== undefined) {
      return parseFloat(Math.abs(parseFloat(item.end) - parseFloat(item.start)).toFixed(3));
    }
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

/**
 * Calculates physical start (upstream) and end (downstream) face coordinates in meters.
 * For general components: position X (distance) is the center (start = X - L/2, end = X + L/2).
 * For SOURCE: downstream face is the reference zero position (end = distance, start = end - L).
 */
export const getItemBoundsM = (item) => {
  const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
  const isSource = item.type === 'SOURCE';
  const len = getItemLengthM(item);
  let dist = parseFloat(item.distance) || 0;

  if (isSource) {
    let end = item.end !== undefined ? parseFloat(item.end) : dist;
    let start = item.start !== undefined ? parseFloat(item.start) : parseFloat((end - len).toFixed(3));
    return {
      dist: parseFloat(end.toFixed(3)),
      len: parseFloat(len.toFixed(3)),
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3))
    };
  }

  let start = item.start !== undefined ? parseFloat(item.start) : parseFloat((dist - len / 2).toFixed(3));
  let end = item.end !== undefined ? parseFloat(item.end) : parseFloat((dist + len / 2).toFixed(3));

  if (isRange && item.start !== undefined && item.end !== undefined) {
    start = parseFloat(item.start);
    end = parseFloat(item.end);
    dist = parseFloat(((start + end) / 2).toFixed(3));
  }
  return {
    dist: parseFloat(dist.toFixed(3)),
    len: parseFloat(len.toFixed(3)),
    start: parseFloat(start.toFixed(3)),
    end: parseFloat(end.toFixed(3))
  };
};

/**
 * Calculates updated component boundaries when start, end, distance, or length is edited.
 * Supports:
 * - 'ADJUST_LENGTH' (default): editing start or end adjusts length, anchoring the opposite face.
 * - 'LOCK_LENGTH': editing start or end shifts the component along the beamline, keeping length constant.
 * - 'LOCK_CENTER': editing start or end resizes symmetrically around the locked center.
 * Exception for SOURCE: downstream face is anchored at the zero position (or edited end).
 */
export const calculateUpdatedBounds = (item, field, rawValue, constraint = 'ADJUST_LENGTH') => {
  const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
  const isSource = item.type === 'SOURCE';
  const bounds = getItemBoundsM(item);
  const currentStart = bounds.start;
  const currentEnd = bounds.end;
  const currentDist = bounds.dist;
  const currentLen = bounds.len;

  const effectiveConstraint = item.lockLength 
    ? 'LOCK_LENGTH' 
    : (item.lockCenter ? 'LOCK_CENTER' : constraint);

  const val = parseFloat(rawValue);
  if (isNaN(val)) return item;

  let newStart = currentStart;
  let newEnd = currentEnd;
  let newDist = currentDist;
  let newLen = currentLen;

  if (isSource) {
    if (field === 'start') {
      newStart = parseFloat(val.toFixed(3));
      if (effectiveConstraint === 'LOCK_LENGTH') {
        newEnd = parseFloat((newStart + currentLen).toFixed(3));
        newDist = newEnd;
      } else {
        newLen = Math.max(0.05, parseFloat((currentEnd - newStart).toFixed(3)));
        newEnd = currentEnd;
        newDist = newEnd;
      }
    } else if (field === 'end') {
      newEnd = parseFloat(val.toFixed(3));
      if (effectiveConstraint === 'LOCK_LENGTH') {
        newStart = parseFloat((newEnd - currentLen).toFixed(3));
        newDist = newEnd;
      } else {
        newLen = Math.max(0.05, parseFloat((newEnd - currentStart).toFixed(3)));
        newStart = currentStart;
        newDist = newEnd;
      }
    } else if (field === 'distance' || field === 'dist') {
      newDist = parseFloat(val.toFixed(3));
      newEnd = newDist;
      newStart = parseFloat((newEnd - currentLen).toFixed(3));
    } else if (field === 'length') {
      newLen = Math.max(0.05, parseFloat(val.toFixed(3)));
      newEnd = currentEnd;
      newStart = parseFloat((newEnd - newLen).toFixed(3));
      newDist = newEnd;
    }
  } else if (field === 'start') {
    if (effectiveConstraint === 'LOCK_LENGTH') {
      newStart = parseFloat(val.toFixed(3));
      newEnd = parseFloat((newStart + currentLen).toFixed(3));
      newDist = parseFloat(((newStart + newEnd) / 2).toFixed(3));
      newLen = currentLen;
    } else if (effectiveConstraint === 'LOCK_CENTER') {
      newStart = parseFloat(val.toFixed(3));
      const half = Math.abs(currentDist - newStart);
      newLen = parseFloat(Math.max(0.01, half * 2).toFixed(3));
      newStart = parseFloat((currentDist - half).toFixed(3));
      newEnd = parseFloat((currentDist + half).toFixed(3));
      newDist = currentDist;
    } else {
      // ADJUST_LENGTH (Default): anchor downstream face
      newStart = parseFloat(val.toFixed(3));
      let anchorEnd = currentEnd;
      if (newStart >= anchorEnd) {
        newLen = 0.05;
        anchorEnd = parseFloat((newStart + newLen).toFixed(3));
      } else {
        newLen = parseFloat((anchorEnd - newStart).toFixed(3));
      }
      newEnd = anchorEnd;
      newDist = parseFloat(((newStart + newEnd) / 2).toFixed(3));
    }
  } else if (field === 'end') {
    if (effectiveConstraint === 'LOCK_LENGTH') {
      newEnd = parseFloat(val.toFixed(3));
      newStart = parseFloat((newEnd - currentLen).toFixed(3));
      newDist = parseFloat(((newStart + newEnd) / 2).toFixed(3));
      newLen = currentLen;
    } else if (effectiveConstraint === 'LOCK_CENTER') {
      newEnd = parseFloat(val.toFixed(3));
      const half = Math.abs(newEnd - currentDist);
      newLen = parseFloat(Math.max(0.01, half * 2).toFixed(3));
      newStart = parseFloat((currentDist - half).toFixed(3));
      newEnd = parseFloat((currentDist + half).toFixed(3));
      newDist = currentDist;
    } else {
      // ADJUST_LENGTH (Default): anchor upstream face
      newEnd = parseFloat(val.toFixed(3));
      let anchorStart = currentStart;
      if (newEnd <= anchorStart) {
        newLen = 0.05;
        anchorStart = parseFloat((newEnd - newLen).toFixed(3));
      } else {
        newLen = parseFloat((newEnd - anchorStart).toFixed(3));
      }
      newStart = anchorStart;
      newDist = parseFloat(((newStart + newEnd) / 2).toFixed(3));
    }
  } else if (field === 'distance' || field === 'dist') {
    newDist = parseFloat(val.toFixed(3));
    newStart = parseFloat((newDist - currentLen / 2).toFixed(3));
    newEnd = parseFloat((newDist + currentLen / 2).toFixed(3));
    newLen = currentLen;
  } else if (field === 'length') {
    newLen = Math.max(0.01, parseFloat(val.toFixed(3)));
    newDist = currentDist;
    newStart = parseFloat((newDist - newLen / 2).toFixed(3));
    newEnd = parseFloat((newDist + newLen / 2).toFixed(3));
  }

  const updated = {
    ...item,
    distance: isSource ? newEnd : newDist,
    length: newLen,
    start: newStart,
    end: newEnd,
    x: ORIGIN_X + (isSource ? newEnd : newDist) * PX_PER_M
  };

  if (isRange) {
    updated.dimX = Math.abs(newEnd - newStart) * PX_PER_M;
  } else if (isSource) {
    updated.dimX = newLen * PX_PER_M;
    if (item.sourceType !== 'Bending Magnet') {
      const pLen = item.periodLength || (item.sourceType === 'Wiggler' ? 100 : 50);
      updated.periodLength = pLen;
      updated.numPeriods = Math.max(1, Math.round((newLen * 1000) / pLen));
    }
  } else {
    updated.showFootprint = true;
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
    const isOptical = !['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
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

    // Gap to immediate next item in list
    let gapToNext = null;
    let nextItemName = null;
    if (idx < sorted.length - 1) {
      const nextBounds = getItemBoundsM(sorted[idx + 1]);
      gapToNext = parseFloat((nextBounds.start - bounds.end).toFixed(3));
      nextItemName = sorted[idx + 1].customName || TYPES[sorted[idx + 1].type]?.name || sorted[idx + 1].type;
    } else {
      gapToNext = parseFloat((canvasLength - bounds.end).toFixed(3));
      nextItemName = 'End of Beamline';
    }

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
      length: bounds.len,
      start: bounds.start,
      end: bounds.end,
      height: item.height !== undefined ? parseFloat(item.height) : 0,
      offset: item.offset !== undefined ? parseFloat(item.offset) : 0,
      enclosureName,
      gapToNext,
      nextItemName,
      isOverlap: gapToNext !== null && gapToNext < -0.005,
      overlapAmount: gapToNext !== null && gapToNext < -0.005 ? Math.abs(gapToNext) : 0
    };
  });

  // Calculate gaps between optical components specifically
  opticalItems.forEach((opt, oIdx) => {
    if (oIdx < opticalItems.length - 1) {
      const currB = getItemBoundsM(opt);
      const nextB = getItemBoundsM(opticalItems[oIdx + 1]);
      const gap = parseFloat((nextB.start - currB.end).toFixed(3));
      if (gap < -0.005) {
        overlaps.push({
          itemA: opt,
          itemB: opticalItems[oIdx + 1],
          nameA: opt.customName || TYPES[opt.type]?.name || opt.type,
          nameB: opticalItems[oIdx + 1].customName || TYPES[opticalItems[oIdx + 1].type]?.name || opticalItems[oIdx + 1].type,
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
    'Physical Length (m)',
    'Upstream Face X_start (m)',
    'Downstream Face X_end (m)',
    'Clearance to Next (m)',
    'Next Component',
    'Elevation Y (m)',
    'Lateral Offset Z (m)',
    'Enclosure / Section',
    'Status'
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

    const row = [
      r.index,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      r.type,
      r.dist.toFixed(3),
      r.length.toFixed(3),
      r.start.toFixed(3),
      r.end.toFixed(3),
      r.gapToNext !== null ? r.gapToNext.toFixed(3) : 'N/A',
      `"${(r.nextItemName || '').replace(/"/g, '""')}"`,
      r.height.toFixed(3),
      r.offset.toFixed(3),
      `"${(r.enclosureName || '').replace(/"/g, '""')}"`,
      `"${status}"`
    ];
    lines.push(row.join(','));
  });

  return lines.join('\n');
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

      const compHeightUnits = isRange ? (viewHeight * 0.6) : (TYPES[item.type]?.height ? (TYPES[item.type].height / PX_PER_M) * scale : 400 * (scale / 1000));

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
