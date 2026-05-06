import React from 'react';
import { TYPES } from '../constants';
import { getDefaultColors } from '../utils';

export const OpticalComponent = ({ item, viewType, tracePoints, theme, isDarkMode }) => {
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
          <svg width="100%" height="100%" viewBox="0 0 80 24" style={{ overflow: 'visible' }} className="drop-shadow-sm">
            <path d="M 0,16 Q 40,-4 80,16 L 80,32 Q 40,12 0,32 Z" fill={primary} stroke={secondary} strokeWidth="1.5" />
          </svg>
        );
      }
      return (
        <div className="flex flex-col w-full h-full justify-between bg-transparent">
          <div className="flex w-full h-[45%] shadow-sm rounded-none" style={{ backgroundColor: primary, border: `1.5px solid ${theme.compBorder}`}}></div>
          <div className="flex w-full h-[45%] shadow-sm rounded-none" style={{ backgroundColor: secondary, border: `1.5px solid ${theme.compBorder}`}}></div>
        </div>
      );
    }

    const periods = sType === 'Wiggler' ? 4 : 6;

    if (viewType === 'TOP') {
      return (
        <div className="flex flex-col w-full h-full shadow-sm rounded-none overflow-hidden" style={{ backgroundColor: 'transparent', border: `1.5px solid ${theme.compBorder}`}}>
          <div className="flex w-full h-full">
            {[...Array(periods)].map((_, i) => <div key={i} className="flex-1" style={{backgroundColor: i % 2 === 0 ? primary : secondary}} />)}
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col w-full h-full justify-between bg-transparent">
        <div className="flex w-full h-[35%] shadow-sm rounded-none overflow-hidden" style={{ border: `1.5px solid ${theme.compBorder}`}}>
          {[...Array(periods)].map((_, i) => <div key={i} className="flex-1" style={{backgroundColor: i % 2 === 0 ? primary : secondary}} />)}
        </div>
        <div className="flex w-full h-[35%] shadow-sm rounded-none overflow-hidden" style={{ border: `1.5px solid ${theme.compBorder}`}}>
          {[...Array(periods)].map((_, i) => <div key={i} className="flex-1" style={{backgroundColor: i % 2 === 0 ? secondary : primary}} />)}
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
         <div className="w-4 h-4 rounded-full border-[2.5px]" style={{ borderColor: primary, backgroundColor: item.passLight === false ? secondary : 'transparent' }} />
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
         <div className="w-full h-[6px] opacity-70" style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, ${secondary} 2px, ${secondary} 4px)` }} />
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

  if (type === 'HUTCH') {
    return (
      <div className="w-full h-full border-[2px] border-dashed rounded-none"
           style={{ 
             borderColor: primary,
             backgroundColor: secondary
           }}>
      </div>
    );
  }
  
  if (type === 'XBPM') {
    return (
      <div className="w-full h-full grid grid-cols-2 grid-rows-2 relative shadow-sm rounded-none" style={{ backgroundColor: theme.compBg, border: `1.5px solid ${primary}` }}>
        <div className="border-r border-b" style={{ borderColor: primary }}></div>
        <div className="border-b" style={{ borderColor: primary }}></div>
        <div className="border-r" style={{ borderColor: primary }}></div>
        <div></div>
        <div className="absolute top-1/2 left-1/2 w-2 h-2 rounded-none transform -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: secondary, boxShadow: `0 0 4px ${secondary}`}}></div>
      </div>
    );
  }
  
  if (type === 'SCREEN') {
    return (
      <div className="w-full h-full shadow-[0_0_8px_rgba(34,197,94,0.5)] flex justify-center items-center rounded-none border" style={{ backgroundColor: theme.compBg, borderColor: primary, boxShadow: `0 0 8px ${primary}88` }}>
        <div className="w-[2px] h-full" style={{ backgroundColor: secondary }}></div>
      </div>
    );
  }
  
  if (type === 'VDCM' || type === 'HDCM') {
    const isInactive = (type === 'VDCM' && viewType === 'TOP') || (type === 'HDCM' && viewType === 'SIDE');
    if (isInactive) {
      return (
         <div className="w-full h-full flex flex-col justify-center shadow-sm opacity-90 rounded-none" style={{ backgroundColor: theme.inactiveBg, border: `1px dashed ${theme.inactiveBorder}` }}>
           <div className="w-full h-[1.5px]" style={{ backgroundColor: theme.inactiveBorder }} />
         </div>
      );
    }

    let c1Config = { left: 40, top: 30, rot: 0, origin: '50% 0%', translate: 'translate(-50%, 0%)', justify: 'justify-end' };
    let c2Config = { left: 80, top: 30, rot: 0, origin: '50% 0%', translate: 'translate(-50%, 0%)', justify: 'justify-end' };

    if (tracePoints) {
      const idx1 = tracePoints.findIndex(p => p.parentId === item.id && p.sub === 1);
      const idx2 = tracePoints.findIndex(p => p.parentId === item.id && p.sub === 2);
      
      if (idx1 !== -1 && idx2 !== -1) {
         const p1 = tracePoints[idx1];
         const p2 = tracePoints[idx2];
         const offset = item.exitOffset ?? 0.5;
         const theta_deg = item.braggAngle ?? 20;
         const theta_rad = theta_deg * Math.PI / 180;

         const localAnchorX = 40; 
         c1Config.left = localAnchorX + (p1.x - item.x);
         c1Config.top = 30 + (p1[planeCoord] - item[planeCoord]);
         c2Config.left = localAnchorX + (p2.x - item.x);
         c2Config.top = 30 + (p2[planeCoord] - item[planeCoord]);

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
      <div className="w-full h-full relative rounded-none" style={{ border: `1px dashed ${theme.inactiveBorder}` }}>
        <div className={`absolute flex flex-col shadow-sm rounded-none ${c1Config.justify}`}
             style={{ width: `${c1Len}px`, height: '10px', left: `${c1Config.left}px`, top: `${c1Config.top}px`, transformOrigin: c1Config.origin, transform: `${c1Config.translate} rotate(${c1Config.rot}rad)`, ...crystalStyle}}>
          <div className="w-full h-1/2 opacity-50" style={hatchStyle} />
        </div>
        <div className={`absolute flex flex-col shadow-sm rounded-none ${c2Config.justify}`}
             style={{ width: `${c2Len}px`, height: '10px', left: `${c2Config.left}px`, top: `${c2Config.top}px`, transformOrigin: c2Config.origin, transform: `${c2Config.translate} rotate(${c2Config.rot}rad)`, ...crystalStyle}}>
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
  
  if (type === 'DETECTOR') {
    const isBlocking = item.passLight !== true;
    const dType = item.detectorType || 'Silicon Detector';
    
    let innerContent = null;
    if (dType === 'Ionization Chamber') {
       innerContent = (
          <div className="flex flex-col gap-2 w-full h-full items-center justify-center">
             <div className="w-3/4 h-[2px] opacity-70" style={{ backgroundColor: secondary }}></div>
             <div className="w-3/4 h-[2px] opacity-70" style={{ backgroundColor: secondary }}></div>
          </div>
       );
    } else if (dType === 'Silicon Detector') {
       innerContent = <div className="w-1/3 h-1/3 opacity-70" style={{ backgroundColor: secondary }}></div>;
    } else if (dType === 'Image Plate') {
       innerContent = <div className="w-[4px] h-[90%] opacity-80" style={{ backgroundColor: secondary }}></div>;
    } else if (dType === 'Strip Detector') {
       innerContent = (
          <div className="flex gap-[2px] w-full h-full items-center justify-center p-1">
             <div className="w-[2px] h-3/4 opacity-70" style={{ backgroundColor: secondary }}></div>
             <div className="w-[2px] h-3/4 opacity-70" style={{ backgroundColor: secondary }}></div>
             <div className="w-[2px] h-3/4 opacity-70" style={{ backgroundColor: secondary }}></div>
          </div>
       );
    }

    return (
      <div className="w-full h-full shadow-sm rounded-none flex items-center justify-center relative" style={{ backgroundColor: primary, border: `1.5px solid ${theme.compBorder}` }}>
         {innerContent}
         {isBlocking && <div className="absolute right-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: secondary }}></div>}
      </div>
    );
  }
  return null;
};
