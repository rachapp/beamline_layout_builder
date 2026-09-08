import { TYPES, ORIGIN_X, PX_PER_M } from '../constants/index.js';

export const mapTemplateToItems = (templateData) => {
  return templateData.map((item, idx) => {
    const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
    const dist = parseFloat(item.distance) || 0;
    
    let x = ORIGIN_X + dist * PX_PER_M;
    const itemConfig = TYPES[item.type];
    let sourceProps = {};
    if (item.type === 'SOURCE') {
      const sType = item.sourceType || 'Undulator';
      if (sType === 'Bending Magnet') {
        const sLen = item.length !== undefined ? parseFloat(item.length) : 1.5;
        sourceProps = {
          sourceType: sType,
          length: sLen,
          dimX: sLen * PX_PER_M
        };
      } else {
        const periodLength = item.periodLength !== undefined ? parseFloat(item.periodLength) : (sType === 'Wiggler' ? 100 : 50);
        const numPeriods = item.numPeriods !== undefined ? parseInt(item.numPeriods) : (item.length !== undefined ? Math.max(1, Math.round((parseFloat(item.length) * 1000) / periodLength)) : (sType === 'Wiggler' ? 20 : 40));
        const length = item.length !== undefined ? parseFloat(item.length) : parseFloat(((periodLength * numPeriods) / 1000).toFixed(3));
        sourceProps = {
          sourceType: sType,
          periodLength,
          numPeriods,
          length,
          dimX: length * PX_PER_M
        };
      }
    }

    const physicalLength = sourceProps.length ?? (item.length !== undefined ? parseFloat(item.length) : itemConfig.defaultLength);
    let dimX = sourceProps.dimX ?? (physicalLength !== undefined ? (physicalLength * PX_PER_M) : (item.dimX ?? itemConfig.width));
    
    const h = parseFloat(item.height) ?? (isRange ? (TYPES[item.type].height / PX_PER_M) : 0);
    const o = parseFloat(item.offset) ?? 0;
    
    const isChamber = item.type === 'CHAMBER';
    const y = isChamber ? 150 - (h * PX_PER_M) : ((isRange) ? 200 - (h * PX_PER_M) / 2 : 150 - (h * PX_PER_M));
    const z = isChamber ? 150 + (o * PX_PER_M) : ((isRange) ? 150 : 150 + (o * PX_PER_M));
    
    let dimY = isRange ? (h * PX_PER_M) : undefined;
    let dimZ = isRange ? (h * PX_PER_M) : undefined;

    if (item.type === 'XBPM') {
      dimY = dimX;
      dimZ = dimX;
    }

    const isSource = item.type === 'SOURCE';
    let start = parseFloat(item.start);
    let end = parseFloat(item.end);

    if (isRange && !isNaN(start) && !isNaN(end)) {
      const startX = ORIGIN_X + start * PX_PER_M;
      const endX = ORIGIN_X + end * PX_PER_M;
      x = (startX + endX) / 2;
      dimX = Math.abs(endX - startX);
    } else if (isRange) {
      const wMeters = (item.dimX ?? itemConfig.width) / PX_PER_M;
      start = dist - wMeters / 2;
      end = dist + wMeters / 2;
    } else if (isSource) {
      end = isNaN(end) ? dist : end;
      start = isNaN(start) ? parseFloat((end - physicalLength).toFixed(3)) : start;
    } else if (['VDCM', 'HDCM'].includes(item.type)) {
      const chLen = item.chamberLength !== undefined ? parseFloat(item.chamberLength) : (item.housingLength !== undefined ? parseFloat(item.housingLength) : 1.5);
      dimX = chLen * PX_PER_M;
      if (item.housingHeight !== undefined) {
        dimY = parseFloat(item.housingHeight) * PX_PER_M;
        dimZ = parseFloat(item.housingHeight) * PX_PER_M;
      }
    } else if (['VFM', 'HFM'].includes(item.type)) {
      const substrateThickness = item.substrateThickness !== undefined ? parseFloat(item.substrateThickness) : 0.3;
      const faceHeight = item.faceHeight !== undefined ? parseFloat(item.faceHeight) : 1.0;
      item.substrateThickness = substrateThickness;
      item.faceHeight = faceHeight;
    }

    return {
      ...item,
      ...sourceProps,
      length: physicalLength,
      id: Date.now() + idx,
      x,
      dimX,
      y,
      z,
      height: h,
      offset: o,
      distance: isRange ? ((start || 0) + (end || 0)) / 2 : dist,
      dimY,
      dimZ,
      showLabel: item.showLabel !== false,
      showFootprint: Boolean(item.showFootprint),
      showFootprintText: Boolean(item.showFootprintText),
      ...(item.type === 'DETECTOR' ? { stayInPath: item.stayInPath !== false } : {}),
      ...(isRange ? { start, end } : (isSource ? { start, end } : {}))
    };
  }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
};

export const getItemVisualHeight = (item, viewType) => {
  if (!item) return 20;
  const conf = TYPES[item.type] || {};
  if (item.type === 'XBPM') return conf.height || 8.5;
  if (item.type === 'VFM') {
    const th = Math.max(2, (item.substrateThickness !== undefined ? parseFloat(item.substrateThickness) : 0.3) * PX_PER_M);
    const face = Math.max(4, (item.faceHeight !== undefined ? parseFloat(item.faceHeight) : 1.0) * PX_PER_M);
    return viewType === 'SIDE' ? th : face;
  }
  if (item.type === 'HFM') {
    const th = Math.max(2, (item.substrateThickness !== undefined ? parseFloat(item.substrateThickness) : 0.3) * PX_PER_M);
    const face = Math.max(4, (item.faceHeight !== undefined ? parseFloat(item.faceHeight) : 1.0) * PX_PER_M);
    return viewType === 'TOP' ? th : face;
  }
  if (item.type === 'SOURCE') {
    const sType = item.sourceType || 'Undulator';
    if (sType === 'Bending Magnet') {
      return viewType === 'SIDE' ? (item.dimY ?? conf.height ?? 24) : (item.dimZ ?? conf.height ?? 24);
    }
    // Undulator / Wiggler: top view height reduced by half of current (24px -> 12px)
    if (viewType === 'TOP') {
      const baseH = item.dimZ ?? conf.height ?? 24;
      return baseH / 2;
    }
    return item.dimY ?? conf.height ?? 24;
  }
  return viewType === 'SIDE' ? (item.dimY ?? conf.height ?? 20) : (item.dimZ ?? conf.height ?? 20);
};

export const getDefaultColors = (type, isDarkMode, theme) => {
    switch(type) {
      case 'SOURCE': return { primary: '#ef4444', secondary: '#2563eb' };
      case 'SLIT': return { primary: theme.compBorder, secondary: 'transparent' };
      case 'FILTER': return { primary: '#fbbf24', secondary: theme.compBorder };
      case 'GRATING': return { primary: isDarkMode ? '#475569' : '#cbd5e1', secondary: isDarkMode ? '#94a3b8' : '#64748b' };
      case 'WALL': return { primary: isDarkMode ? '#ffffff' : '#000000', secondary: theme.compBg };
      case 'HUTCH': return { primary: isDarkMode ? '#475569' : '#94a3b8', secondary: 'transparent' };
      case 'CHAMBER': return { primary: isDarkMode ? '#60a5fa' : '#3b82f6', secondary: 'transparent' };
      case 'XBPM': return { primary: theme.compBorder, secondary: '#ef4444' };
      case 'SCREEN': return { primary: '#22c55e', secondary: theme.compBorder };
      case 'VDCM': case 'HDCM': return { primary: '#0891b2', secondary: isDarkMode ? '#164e63' : '#cffafe' };
      case 'VFM': case 'HFM': return { primary: theme.compBorder, secondary: isDarkMode ? '#475569' : '#cbd5e1' };
      case 'SAMPLE': return { primary: theme.compBorder, secondary: theme.compBorder };
      case 'DETECTOR': return { primary: theme.compBg, secondary: theme.compBorder };
      case 'ANCHOR_SIDE': return { primary: '#0284c7', secondary: '#38bdf8' };
      case 'ANCHOR_TOP': return { primary: '#8b5cf6', secondary: '#a78bfa' };
      case 'ANCHOR': return { primary: '#3b82f6', secondary: '#60a5fa' };
      default: return { primary: theme.compBorder, secondary: theme.compBg };
    }
};
