import { TYPES, ORIGIN_X, PX_PER_M } from '../constants';

export const mapTemplateToItems = (templateData) => {
  return templateData.map((item, idx) => {
    const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
    const dist = parseFloat(item.distance) || 0;
    
    let x = ORIGIN_X + dist * PX_PER_M;
    const itemConfig = TYPES[item.type];
    const physicalLength = item.length ?? itemConfig.defaultLength;
    let dimX = physicalLength !== undefined ? (physicalLength * PX_PER_M) : (item.dimX ?? itemConfig.width);
    
    const h = parseFloat(item.height) ?? (isRange ? (TYPES[item.type].height / PX_PER_M) : 0);
    const o = parseFloat(item.offset) ?? 0;
    
    const isChamber = item.type === 'CHAMBER';
    const y = isChamber ? 150 : ((isRange) ? 200 - (h * PX_PER_M) / 2 : 150 - (h * PX_PER_M));
    const z = isChamber ? 150 : ((isRange) ? 150 : 150 + (o * PX_PER_M));
    
    const dimY = isRange ? (h * PX_PER_M) : undefined;
    const dimZ = isRange ? (h * PX_PER_M) : undefined;

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
    } else if (['VDCM', 'HDCM'].includes(item.type)) {
      const D_m = parseFloat(item.exitOffset) ?? 0.5;
      const theta_deg = parseFloat(item.braggAngle) ?? 20;
      const tan2theta = Math.tan(2 * theta_deg * Math.PI / 180);
      const L = Math.abs(tan2theta) > 0.001 ? Math.abs((D_m * PX_PER_M) / tan2theta) : 40;
      dimX = L + 80;
    }

    return {
      ...item,
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
      ...(isRange ? { start, end } : {})
    };
  }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
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
      case 'SCREEN': return { primary: '#22c55e', secondary: '#22c55e' };
      case 'VDCM': case 'HDCM': return { primary: '#0891b2', secondary: isDarkMode ? '#164e63' : '#cffafe' };
      case 'VFM': case 'HFM': return { primary: theme.compBorder, secondary: isDarkMode ? '#475569' : '#cbd5e1' };
      case 'SAMPLE': return { primary: theme.compBorder, secondary: theme.compBorder };
      case 'DETECTOR': return { primary: theme.compBg, secondary: theme.compBorder };
      default: return { primary: theme.compBorder, secondary: theme.compBg };
    }
};
