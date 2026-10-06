import { TYPES, PX_PER_M, ORIGIN_X, PX_PER_MM_V, BEAM_AXIS_PX, FLOOR_PX, isAnchorType, isRangeType, isWallType, isDcmType, isMirrorType } from '../constants/index.js';
import { getItemMiscParams, setItemMiscParam } from './miscParams.js';
import { computeConstructionSchedule } from './schedule.js';
import { downloadBlob } from './download.js';

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
    const item = r.item || {};
    const misc = r.misc || getItemMiscParams(item);

    // Wall/Enclosure Width & Height
    const wallW = isWallType(r.type)
      ? (item.wallWidth !== undefined ? Number(item.wallWidth).toFixed(3) : (item.dimZ ? (item.dimZ / PX_PER_M).toFixed(3) : '7.000'))
      : (r.type === 'CHAMBER' ? (item.height !== undefined ? Number(item.height).toFixed(3) : (item.dimZ ? (item.dimZ / PX_PER_M).toFixed(3) : '3.000')) : '');
    const wallH = isWallType(r.type)
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
      isWallType(r.type) ? '-' : (r.heightMm !== null && r.heightMm !== undefined ? Number(r.heightMm).toFixed(1) : (r.height !== null && r.height !== undefined && !isNaN(Number(r.height)) ? Number(r.height).toFixed(1) : '-')),
      isWallType(r.type) ? '-' : (r.offsetMm !== null && r.offsetMm !== undefined ? Number(r.offsetMm).toFixed(1) : (r.offset !== null && r.offset !== undefined && !isNaN(Number(r.offset)) ? Number(r.offset).toFixed(1) : '-')),
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
    const isRange = isRangeType(compType);
    const isSource = compType === 'SOURCE';

    const name = (nameIdx !== -1 && cols[nameIdx]) ? cols[nameIdx] : conf.name;
    const dist = posXIdx !== -1 && !isNaN(parseFloat(cols[posXIdx])) ? parseFloat(cols[posXIdx]) : 0;
    
    const rawDetectorType = (compType === 'DETECTOR' && miscAIdx !== -1 && cols[miscAIdx]) ? cols[miscAIdx].trim() : '';
    const isAnchorItem = isAnchorType(compType);
    const isVirtualAnchor = isAnchorItem || (compType === 'DETECTOR' && rawDetectorType === 'Virtual Anchor');

    let physLen = conf.defaultLength || (isAnchorItem ? 0 : 1.0);
    if (isVirtualAnchor) {
      physLen = 0;
    } else if (physLenIdx !== -1 && !isNaN(parseFloat(cols[physLenIdx]))) {
      const parsed = parseFloat(cols[physLenIdx]);
      physLen = ((isAnchorItem || compType === 'DETECTOR') && parsed === 0) ? 0 : Math.max(0.01, parsed);
    } else if (boxLenIdx !== -1 && !isNaN(parseFloat(cols[boxLenIdx]))) {
      const parsed = parseFloat(cols[boxLenIdx]);
      physLen = ((isAnchorItem || compType === 'DETECTOR') && parsed === 0) ? 0 : Math.max(0.01, parsed);
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
      } else if (isDcmType(compType)) {
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
      if (isRangeType(compType)) {
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
      : (isWallType(compType) && miscAIdx !== -1 && !isNaN(parseFloat(cols[miscAIdx]))
          ? parseFloat(cols[miscAIdx])
          : (conf.height ? conf.height / PX_PER_M : 7.0));

    let wallH = (wallHeightIdx !== -1 && !isNaN(parseFloat(cols[wallHeightIdx])))
      ? parseFloat(cols[wallHeightIdx])
      : (isWallType(compType) && miscBIdx !== -1 && !isNaN(parseFloat(cols[miscBIdx]))
          ? parseFloat(cols[miscBIdx])
          : ((!isElevDash && parsedHeight > 0) ? (isElevMmHeader ? parsedHeight / 1000 : parsedHeight) : (conf.height ? conf.height / PX_PER_M : 7.0)));

    const chamberH = wallHeightIdx !== -1 && !isNaN(parseFloat(cols[wallHeightIdx]))
      ? parseFloat(cols[wallHeightIdx])
      : ((!isElevDash && parsedHeight > 0) ? (isElevMmHeader ? parsedHeight / 1000 : parsedHeight) : (compType === 'CHAMBER' && miscAIdx !== -1 && !isNaN(parseFloat(cols[miscAIdx])) ? parseFloat(cols[miscAIdx]) : (conf.height / PX_PER_M || 3.0)));

    // Sizing and positioning calculations
    let dimX, dimY, dimZ, x, y, z, actualDistance;
    if (isWallType(compType)) {
      dimX = Math.abs(endVal - startVal) * PX_PER_M;
      dimY = wallH * PX_PER_M;
      dimZ = wallW * PX_PER_M;
      actualDistance = parseFloat(((startVal + endVal) / 2).toFixed(3));
      x = ORIGIN_X + actualDistance * PX_PER_M;
      y = FLOOR_PX - (wallH * PX_PER_M) / 2;
      z = BEAM_AXIS_PX;
    } else if (compType === 'CHAMBER') {
      dimX = Math.abs(endVal - startVal) * PX_PER_M;
      dimY = chamberH * PX_PER_M;
      dimZ = chamberH * PX_PER_M;
      actualDistance = parseFloat(((startVal + endVal) / 2).toFixed(3));
      x = ORIGIN_X + actualDistance * PX_PER_M;
      y = BEAM_AXIS_PX - chamberH * PX_PER_M;
      z = BEAM_AXIS_PX + o_mm * PX_PER_MM_V;
    } else if (isSource) {
      dimX = physLen * PX_PER_M;
      dimY = conf.height;
      dimZ = 30; // 1.5 units (1.5 * 20px = 30px)
      actualDistance = dist;
      x = ORIGIN_X + dist * PX_PER_M;
      y = BEAM_AXIS_PX - h_mm * PX_PER_MM_V;
      z = BEAM_AXIS_PX + o_mm * PX_PER_MM_V;
    } else if (isDcmType(compType)) {
      const boxLen = parseFloat(Math.abs(endVal - startVal).toFixed(3));
      dimX = boxLen * PX_PER_M;
      dimY = conf.height;
      dimZ = conf.height;
      actualDistance = dist;
      x = ORIGIN_X + dist * PX_PER_M;
      y = BEAM_AXIS_PX - h_mm * PX_PER_MM_V;
      z = BEAM_AXIS_PX + o_mm * PX_PER_MM_V;
    } else if (isMirrorType(compType)) {
      dimX = physLen * PX_PER_M;
      dimY = undefined;
      dimZ = undefined;
      actualDistance = dist;
      x = ORIGIN_X + dist * PX_PER_M;
      y = BEAM_AXIS_PX - h_mm * PX_PER_MM_V;
      z = BEAM_AXIS_PX + o_mm * PX_PER_MM_V;
    } else {
      dimX = physLen * PX_PER_M;
      dimY = conf.height;
      dimZ = (compType === 'SOURCE') ? 30 : conf.height;
      actualDistance = dist;
      x = ORIGIN_X + dist * PX_PER_M;
      y = BEAM_AXIS_PX - h_mm * PX_PER_MM_V;
      z = BEAM_AXIS_PX + o_mm * PX_PER_MM_V;
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
      height: compType === 'CHAMBER' ? chamberH : (isWallType(compType) ? wallH : (isElevDash ? 0 : h_mm)),
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
      if (!isMirrorType(compType) || physLenIdx === -1 || isNaN(parseFloat(cols[physLenIdx]))) {
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
    if (isMirrorType(compType)) {
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
    if (isAnchorItem || (compType === 'DETECTOR' && (item.detectorType === 'Virtual Anchor' || isVirtualAnchor))) {
      item.type = isAnchorItem ? compType : 'DETECTOR';
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

    if (isDcmType(compType)) {
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
  downloadBlob(generateCsvContent(scheduleData), filename, 'text/csv;charset=utf-8;');
};
