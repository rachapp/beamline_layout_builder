import React from 'react';
import { TYPES } from '../constants';
import { getDefaultColors } from '../utils';

export const OpticalComponent = ({ item, itemW: propItemW, viewType, tracePoints, theme, isDarkMode }) => {
  const type = item.type;
  const planeCoord = viewType === 'SIDE' ? 'y' : 'z';
  
  const defaults = getDefaultColors(type, isDarkMode, theme);
  const primary = item.primaryColor || defaults.primary;
  const secondary = item.secondaryColor || defaults.secondary;
  
  if (type === 'SOURCE') {
    const sType = item.sourceType || 'Undulator';

    if (sType === 'Bending Magnet') {
      if (viewType === 'TOP') {
        return (
          <svg width="100%" height="100%" viewBox="0 0 80 24" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <path d="M 0,16 Q 40,-4 80,16 L 80,32 Q 40,12 0,32 Z"
                  fill={primary} stroke={secondary} strokeWidth="1.5" />
          </svg>
        );
      }
      return (
        <div className="flex flex-col w-full h-full justify-between bg-transparent">
          <div className="flex w-full h-[45%] shadow-sm rounded-none"
               style={{ backgroundColor: primary, border: `1.5px solid ${theme.compBorder}` }} />
          <div className="flex w-full h-[45%] shadow-sm rounded-none"
               style={{ backgroundColor: secondary, border: `1.5px solid ${theme.compBorder}` }} />
        </div>
      );
    }

    // Number of periods divided by 10 for visual scaling (e.g. 20 periods -> 2 visual periods)
    const rawPeriods = Math.max(1, parseInt(item.numPeriods) || (sType === 'Wiggler' ? 20 : 40));
    const visualPeriods = Math.max(1, Math.round(rawPeriods / 10));
    const totalPoles = visualPeriods * 2; // 2 poles (N & S) per period

    if (viewType === 'TOP') {
      return (
        <div className="flex flex-col w-full h-full shadow-sm rounded-none overflow-hidden"
             style={{ backgroundColor: 'transparent', border: `1.5px solid ${theme.compBorder}` }}>
          <div className="flex w-full h-full">
            {[...Array(totalPoles)].map((_, i) => (
              <div key={i}
                   className="flex-1 min-w-0 h-full border-r last:border-r-0 border-black/15"
                   style={{ backgroundColor: i % 2 === 0 ? primary : secondary }} />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col w-full h-full justify-between bg-transparent">
        {/* Upper pole array */}
        <div className="flex w-full h-[35%] shadow-sm rounded-none overflow-hidden"
             style={{ border: `1.5px solid ${theme.compBorder}` }}>
          <div className="flex w-full h-full">
            {[...Array(totalPoles)].map((_, i) => (
              <div key={i}
                   className="flex-1 min-w-0 h-full border-r last:border-r-0 border-black/15"
                   style={{ backgroundColor: i % 2 === 0 ? primary : secondary }} />
            ))}
          </div>
        </div>
        {/* Lower pole array (phase-flipped: secondary first) */}
        <div className="flex w-full h-[35%] shadow-sm rounded-none overflow-hidden"
             style={{ border: `1.5px solid ${theme.compBorder}` }}>
          <div className="flex w-full h-full">
            {[...Array(totalPoles)].map((_, i) => (
              <div key={i}
                   className="flex-1 min-w-0 h-full border-r last:border-r-0 border-black/15"
                   style={{ backgroundColor: i % 2 === 0 ? secondary : primary }} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (type === 'SLIT') {
    const isTopView = viewType === 'TOP';
    return (
      <div className="relative w-full h-full">
        <div className="absolute rounded-none shadow-sm" style={{ backgroundColor: primary, width: '4px', height: '42%', top: 0, left: isTopView ? 0 : 'auto', right: isTopView ? 'auto' : 0 }} />
        <div className="absolute rounded-none shadow-sm" style={{ backgroundColor: primary, width: '4px', height: '42%', bottom: 0, left: isTopView ? 0 : 'auto', right: isTopView ? 'auto' : 0 }} />
        <div className="absolute rounded-none shadow-sm" style={{ backgroundColor: primary, width: '4px', height: '28%', top: '20%', left: isTopView ? 'auto' : 0, right: isTopView ? 0 : 'auto' }} />
        <div className="absolute rounded-none shadow-sm" style={{ backgroundColor: primary, width: '4px', height: '28%', bottom: '20%', left: isTopView ? 'auto' : 0, right: isTopView ? 0 : 'auto' }} />
      </div>
    );
  }

  if (type === 'FILTER') {
    return (
      <div className="w-full h-full flex justify-center items-center shadow-sm relative">
         <div className="w-[4px] h-full opacity-80" style={{ backgroundColor: primary, border: `1px solid ${secondary}`}} />
      </div>
    );
  }
  
  if (type === 'SAMPLE') {
    return (
      <div className="w-full h-full flex justify-center items-center shadow-sm relative bg-transparent">
         <div className="w-2 h-2 rounded-full border-[1.5px]" style={{ borderColor: primary, backgroundColor: item.passLight === false ? secondary : 'transparent' }} />
      </div>
    );
  }

  if (type === 'GRATING') {
    const isInactive = (item.orientation || 'Vertical') === 'Vertical' ? viewType === 'TOP' : viewType === 'SIDE';
    if (isInactive) {
      return (
         <div className="w-full h-full flex flex-col justify-center shadow-sm opacity-90 rounded-none" style={{ backgroundColor: theme.inactiveBg, border: `1.5px solid ${theme.inactiveBorder}` }}>
           <div className="w-full h-[1.5px]" style={{ backgroundColor: theme.inactiveBorder }} />
         </div>
      );
    }
    return (
      <div className="w-full h-full flex flex-col justify-start shadow-sm rounded-none border" style={{ borderColor: theme.compBorder, backgroundColor: primary }}>
         <div className="w-full h-[3px] opacity-70" style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, ${secondary} 2px, ${secondary} 4px)` }} />
      </div>
    );
  }

  if (type === 'WALL') {
    return (
      <div className="w-full h-full shadow-sm rounded-none border" 
           style={{ 
             borderColor: theme.compBorder,
             backgroundColor: secondary,
             backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, ${primary} 4px, ${primary} 8px)`,
             opacity: 0.2
           }}>
      </div>
    );
  }

  if (type === 'HUTCH' || type === 'CHAMBER') {
    const isChamber = type === 'CHAMBER';
    return (
      <div className={`w-full h-full border-[2.5px] rounded-none ${isChamber ? 'border-dashed' : 'border-dashed'}`}
           style={{ 
             borderColor: primary,
             backgroundColor: isChamber ? (isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)') : secondary,
             borderStyle: 'dashed'
           }}>
      </div>
    );
  }  
  if (type === 'XBPM') {
    return (
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 20 20" 
        className="block shadow-sm"
        style={{ overflow: 'visible' }}
      >
        {/* Outer square box */}
        <rect 
          x="0.5" 
          y="0.5" 
          width="19" 
          height="19" 
          fill={theme.compBg} 
          stroke={primary} 
          strokeWidth="1" 
        />
        {/* Dead-center quadrant crosshair lines */}
        <line x1="10" y1="0" x2="10" y2="20" stroke={primary} strokeWidth="1" />
        <line x1="0" y1="10" x2="20" y2="10" stroke={primary} strokeWidth="1" />
        {/* Dead-center beam spot with glow */}
        <circle cx="10" cy="10" r="3.5" fill={secondary} opacity="0.3" />
        <circle cx="10" cy="10" r="2" fill={secondary} />
      </svg>
    );
  }
  
  if (type === 'SCREEN') {
    return (
      <div className="w-full h-full flex justify-center items-center shadow-sm relative">
         <div className="w-[4px] h-full opacity-80" style={{ backgroundColor: primary, border: `1px solid ${secondary}` }} />
      </div>
    );
  }
  
  if (type === 'VDCM' || type === 'HDCM') {
    const isInactive = (type === 'VDCM' && viewType === 'TOP') || (type === 'HDCM' && viewType === 'SIDE');
    if (isInactive) {
      return (
         <div className="w-full h-full flex flex-col justify-center shadow-sm opacity-90 rounded-none border" style={{ backgroundColor: theme.inactiveBg, borderColor: theme.inactiveBorder }}>
           <div className="w-full h-[1.5px]" style={{ backgroundColor: theme.inactiveBorder }} />
         </div>
      );
    }

    const conf = TYPES[type];
    const housingH = viewType === 'SIDE' ? (item.dimY ?? conf.height) : (item.dimZ ?? conf.height);
    const centerY = housingH / 2;
    const itemW = propItemW ?? (item.dimX ?? conf.width);

    const parsedOffset = parseFloat(item.exitOffset);
    const offset = !isNaN(parsedOffset) ? parsedOffset : 0.5;
    const parsedTheta = parseFloat(item.braggAngle);
    const theta_deg = !isNaN(parsedTheta) ? parsedTheta : 20;
    const theta_rad = theta_deg * Math.PI / 180;
    const tan2theta = Math.tan(2 * theta_rad);
    const L = Math.abs(tan2theta) > 0.001 ? Math.abs((offset * 20) / tan2theta) : 40;
    const localAnchorX = (itemW - L) / 2;

    let c1Config = { left: localAnchorX, top: centerY, rot: 0, origin: '50% 0%', translate: 'translate(-50%, 0%)', justify: 'justify-end' };
    let c2Config = { left: localAnchorX + L, top: centerY, rot: 0, origin: '50% 0%', translate: 'translate(-50%, 0%)', justify: 'justify-end' };

    if (tracePoints) {
      const idx1 = tracePoints.findIndex(p => p.parentId === item.id && p.sub === 1);
      const idx2 = tracePoints.findIndex(p => p.parentId === item.id && p.sub === 2);
      
      if (idx1 !== -1 && idx2 !== -1) {
         const p1 = tracePoints[idx1];
         const p2 = tracePoints[idx2];

         c1Config.left = localAnchorX + (p1.x - item.x);
         c1Config.top = centerY + (p1[planeCoord] - item[planeCoord]);
         c2Config.left = localAnchorX + (p2.x - item.x);
         c2Config.top = centerY + (p2[planeCoord] - item[planeCoord]);

         const c1IsLower = offset > 0;
         
         if (c1IsLower) {
           c1Config.rot = -theta_rad;
           c1Config.origin = '50% 0%';
           c1Config.translate = 'translate(-50%, 0%)';
           c1Config.justify = 'justify-end';
           c2Config.rot = -theta_rad;
           c2Config.origin = '50% 100%';
           c2Config.translate = 'translate(-50%, -100%)';
           c2Config.justify = 'justify-start';
         } else {
           c1Config.rot = theta_rad;
           c1Config.origin = '50% 100%';
           c1Config.translate = 'translate(-50%, -100%)';
           c1Config.justify = 'justify-start';
           c2Config.rot = theta_rad;
           c2Config.origin = '50% 0%';
           c2Config.translate = 'translate(-50%, 0%)';
           c2Config.justify = 'justify-end';
         }
      }
    }

    const crystalStyle = { border: `1.5px solid ${primary}`, backgroundColor: secondary };
    const hatchStyle = { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'} 2px, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'} 4px)`};

    const c1Len = (item.crystal1Length ?? TYPES[type].defaultCrystal1Length) * 20; // 20px per meter
    const c2Len = (item.crystal2Length ?? TYPES[type].defaultCrystal2Length) * 20;

    return (
      <div 
        className="w-full h-full relative rounded-none border shadow-sm" 
        style={{ 
          borderColor: theme.compBorder, 
          backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)' 
        }}
      >
        <div className={`absolute flex flex-col shadow-sm rounded-none ${c1Config.justify}`}
             style={{ width: `${c1Len}px`, height: '5px', left: `${c1Config.left}px`, top: `${c1Config.top}px`, transformOrigin: c1Config.origin, transform: `${c1Config.translate} rotate(${c1Config.rot}rad)`, ...crystalStyle}}>
          <div className="w-full h-1/2 opacity-50" style={hatchStyle} />
        </div>
        <div className={`absolute flex flex-col shadow-sm rounded-none ${c2Config.justify}`}
             style={{ width: `${c2Len}px`, height: '5px', left: `${c2Config.left}px`, top: `${c2Config.top}px`, transformOrigin: c2Config.origin, transform: `${c2Config.translate} rotate(${c2Config.rot}rad)`, ...crystalStyle}}>
          <div className="w-full h-1/2 opacity-50" style={hatchStyle} />
        </div>
      </div>
    );
  }
  
  if (['VFM', 'HFM'].includes(type)) {
    const isInactive = (type === 'VFM' && viewType === 'TOP') || (type === 'HFM' && viewType === 'SIDE');
    if (isInactive) {
      return (
         <div className="w-full h-full flex flex-col justify-center shadow-sm opacity-90 rounded-none" style={{ backgroundColor: theme.inactiveBg, border: `1.5px solid ${theme.inactiveBorder}` }}>
           <div className="w-full h-[1.5px]" style={{ backgroundColor: theme.inactiveBorder }} />
         </div>
      );
    }
    return (
      <div className="w-full h-full flex flex-col justify-end shadow-sm rounded-none overflow-hidden" style={{ backgroundColor: secondary, border: `1.5px solid ${primary}` }}>
        <div className="w-full h-1/2 opacity-50" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'} 2px, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'} 4px)`}} />
      </div>
    );
  }
  
  if (type === 'ANCHOR' || type === 'ANCHOR_SIDE' || type === 'ANCHOR_TOP') {
    return (
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 10 10" 
        className="block"
        style={{ overflow: 'visible' }}
      >
        <circle cx="5" cy="5" r="2.8" fill="none" stroke={primary} strokeWidth="0.75" opacity="0.85" />
        <circle cx="5" cy="5" r="0.9" fill={secondary} opacity="0.95" />
        <line x1="5" y1="0.5" x2="5" y2="9.5" stroke={primary} strokeWidth="0.6" opacity="0.75" />
        <line x1="0.5" y1="5" x2="9.5" y2="5" stroke={primary} strokeWidth="0.6" opacity="0.75" />
      </svg>
    );
  }

  if (type === 'DETECTOR') {
    const isBlocking = item.passLight !== true;
    const dType = item.detectorType || 'Silicon Detector';
    
    let innerContent = null;
    if (dType === 'Ionization Chamber') {
       innerContent = (
          <div className="flex flex-col gap-1.5 w-full h-full items-center justify-center">
             <div className="w-3/4 h-[2px] opacity-70" style={{ backgroundColor: secondary }}></div>
             <div className="w-3/4 h-[2px] opacity-70" style={{ backgroundColor: secondary }}></div>
          </div>
       );
    } else if (dType === 'Silicon Detector') {
       innerContent = <div className="w-1/3 h-1/3 opacity-70" style={{ backgroundColor: secondary }}></div>;
    } else if (dType === 'Image Plate') {
       innerContent = <div className="w-[3px] h-[90%] opacity-80" style={{ backgroundColor: secondary }}></div>;
    } else if (dType === 'Strip Detector') {
       innerContent = (
          <div className="flex gap-[1.5px] w-full h-full items-center justify-center p-0.5">
             <div className="w-[2px] h-3/4 opacity-70" style={{ backgroundColor: secondary }}></div>
             <div className="w-[2px] h-3/4 opacity-70" style={{ backgroundColor: secondary }}></div>
             <div className="w-[2px] h-3/4 opacity-70" style={{ backgroundColor: secondary }}></div>
          </div>
       );
    }

    return (
      <div className="w-full h-full shadow-sm rounded-none flex items-center justify-center relative" style={{ backgroundColor: primary, border: `1.5px solid ${theme.compBorder}` }}>
         {innerContent}
         {isBlocking && <div className="absolute right-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: secondary }}></div>}
      </div>
    );
  }
  return null;
};
