import React from 'react';
import { Layers, Grid, Magnet, Ruler } from 'lucide-react';
import { OpticalComponent } from './OpticalComponent';
import { TYPES, ORIGIN_X, PX_PER_M, GRID_SIZE } from '../constants';

export const Viewport = ({ 
  viewType, title, refObj, scrollRef, planeCoord, tracePoints, theme, 
  draggingInfo, placingType, pan, zoom, showGrid, showRuler, canvasWidth, 
  isDarkMode, computedItems, selectedId, editingLabel, rayColor, 
  rayWidth, rayStyle, showArrow, sourceItem, handleBgPointerDown, 
  handlePointerMove, handlePointerUp, handleWheel, handlePointerDown, 
  handleResizePointerDown, handleLabelPointerDown, handleLabelDoubleClick,
  setEditingLabel, setItems, ghostPos
}) => {
  const isPanning = draggingInfo?.type === 'pan' && draggingInfo?.view === viewType;

  let strokeDasharray = 'none';
  if (rayStyle === 'dashed') strokeDasharray = '8,4';
  if (rayStyle === 'dotted') strokeDasharray = '2,4';

  return (
    <div className="flex-1 flex flex-col relative border-b-2 overflow-hidden" style={{ borderColor: theme.inactiveBorder, backgroundColor: theme.bg }}>
      <div className={`absolute top-4 left-4 z-20 backdrop-blur px-3 py-1.5 shadow-sm border flex items-center gap-2 rounded-none ${theme.badgeBg}`}>
        <Layers size={16} className={theme.text} />
        <span className={`font-bold text-sm tracking-wide ${theme.text}`}>{title}</span>
      </div>
      
      <div 
        ref={scrollRef}
        className={`flex-1 relative overflow-hidden ${placingType ? 'cursor-crosshair' : (isPanning ? 'cursor-grabbing' : 'cursor-grab')}`} 
        style={{ backgroundColor: theme.canvasBg }} 
        onPointerDown={(e) => handleBgPointerDown(e, viewType)}
        onPointerMove={(e) => handlePointerMove(e, viewType, refObj)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={(e) => handleWheel(e, viewType, scrollRef)}
      >
        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${pan[viewType].x}px, ${pan[viewType].y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <div style={{
            position: 'absolute',
            left: -48000, top: -48000, width: 96000, height: 96000,
            backgroundImage: showGrid ? theme.grid : 'none',
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
          }} />

          <svg style={{ position: 'absolute', overflow: 'visible', zIndex: 10 }}>
            <defs>
              <marker id={`arrowhead-${viewType}`} markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={rayColor} />
              </marker>
              {viewType === 'SIDE' && (
                <pattern id={`floor-hatch-${viewType}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke={theme.inactiveBorder} strokeWidth="2" opacity="0.6" />
                </pattern>
              )}
            </defs>

            {viewType === 'SIDE' && (
              <g>
                <line x1="-48000" y1="200" x2="48000" y2="200" stroke={theme.inactiveBorder} strokeWidth="2" />
                <rect x="-48000" y="200" width="96000" height="12" fill={`url(#floor-hatch-${viewType})`} />
              </g>
            )}

            {showRuler && (
              <g className="ruler-layer">
                <line x1="0" y1="40" x2={canvasWidth} y2="40" stroke={isDarkMode ? '#475569' : '#94a3b8'} strokeWidth="2" />
                {(() => {
                  const maxMeters = Math.ceil(canvasWidth / PX_PER_M);
                  const ticks = [];
                  for (let m = -10; m <= maxMeters; m++) {
                    const x = ORIGIN_X + m * PX_PER_M;
                    if (x < 0 || x > canvasWidth) continue;
                    const isMajor = m % 5 === 0;
                    ticks.push(
                      <g key={`ruler-${m}`}>
                        <line 
                          x1={x} y1="40" 
                          x2={x} y2={isMajor ? "50" : "45"} 
                          stroke={isDarkMode ? '#475569' : '#94a3b8'} 
                          strokeWidth={isMajor ? "2" : "1"} 
                        />
                        {isMajor && (
                          <text 
                            x={x} y="32" 
                            fill={isDarkMode ? '#94a3b8' : '#64748b'} 
                            fontSize="10" 
                            fontFamily="sans-serif" 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            {m}m
                          </text>
                        )}
                      </g>
                    );
                  }
                  return ticks;
                })()}
              </g>
            )}

            {tracePoints.length > 1 && (
              <path
                d={`M ${tracePoints.map(p => `${p.x},${p[planeCoord]}`).join(' L ')}`}
                fill="none" stroke={rayColor} strokeWidth={rayWidth}
                style={{ strokeDasharray, animation: (sourceItem.animate !== false && rayStyle !== 'solid') ? 'dash 1s linear infinite' : 'none' }}
              />
            )}
            {showArrow && tracePoints.slice(0, -1).map((p, i) => {
              const next = tracePoints[i + 1];
              const midX = (p.x + next.x) / 2;
              const midY = (p[planeCoord] + next[planeCoord]) / 2;
              const angle = Math.atan2(next[planeCoord] - p[planeCoord], next.x - p.x) * (180 / Math.PI);
              return (
                <g key={`arrow-${i}`} transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
                  <polygon points="-4,-3 4,0 -4,3" fill={rayColor} />
                </g>
              );
            })}
          </svg>

          <div 
            ref={refObj} 
            className="absolute inset-0" 
            style={{ width: `${canvasWidth}px`, height: '1000px' }}
          >
            {computedItems.map((item) => {
              const conf = TYPES[item.type];
              const isSelected = selectedId === item.id;
              const isDraggingThis = draggingInfo?.id === item.id && draggingInfo.type === 'component';
              const isEditing = editingLabel?.id === item.id;
              
              const isGratingActive = item.type === 'GRATING' && ((viewType === 'SIDE' && (item.orientation || 'Vertical') === 'Vertical') || (viewType === 'TOP' && item.orientation === 'Horizontal'));
              const isSimpleMirrorActive = (item.type === 'VFM' && viewType === 'SIDE') || (item.type === 'HFM' && viewType === 'TOP') || isGratingActive;
              
              const itemW = item.dimX ?? conf.width;
              const itemH = viewType === 'SIDE' ? (item.dimY ?? conf.height) : (item.dimZ ?? conf.height);

              let rotation = 0;
              if (item.type === 'GRATING' || isSimpleMirrorActive) {
                  const pIdx = tracePoints.findIndex(p => p.parentId === item.id && p.sub === 0);
                  if (pIdx > 0 && pIdx < tracePoints.length - 1) {
                      const p = tracePoints[pIdx];
                      const prev = tracePoints[pIdx - 1];
                      const next = tracePoints[pIdx + 1];
                      const angleIn = Math.atan2(p[planeCoord] - prev[planeCoord], p.x - prev.x);
                      const angleOut = Math.atan2(next[planeCoord] - p[planeCoord], next.x - p.x);
                      rotation = (angleIn + angleOut) / 2;
                      if (angleIn < angleOut) rotation += Math.PI;
                      if (item.type === 'GRATING') {
                          rotation -= (parseFloat(item.tiltAngle) ?? 0) * Math.PI / 180;
                      }
                  } else if (item.type === 'GRATING' && isGratingActive) {
                      rotation = -(parseFloat(item.tiltAngle) ?? 0) * Math.PI / 180;
                  }
              }

              const isDCM = item.type === 'VDCM' || item.type === 'HDCM';
              let transformOrigin = isSimpleMirrorActive ? '50% 0%' : (isDCM ? '40px 50%' : '50% 50%');
              let transformOffset = isSimpleMirrorActive ? 'translate(-50%, 0%)' : (isDCM ? 'translate(-40px, -50%)' : 'translate(-50%, -50%)');
              if (item.type === 'SOURCE') {
                  transformOrigin = '100% 50%';
                  transformOffset = 'translate(-100%, -50%)';
              }

              let defaultName = conf.name;
              if (item.type === 'SOURCE') defaultName = item.sourceType || 'Undulator';
              if (item.type === 'DETECTOR') defaultName = item.detectorType || 'Detector';
              const labelName = item.customName || defaultName;
              
              let defaultOffsetY = isSimpleMirrorActive ? itemH + 8 : (itemH / 2) + 8;
              if (item.type === 'SOURCE') defaultOffsetY = 24 + 8;
              if (item.type === 'WALL') defaultOffsetY = (itemH / 2) + 12;
              if (item.type === 'HUTCH') defaultOffsetY = -(itemH / 2) - 12;

              const labelOffsetX = item.labelOffsets?.[viewType]?.x !== undefined ? item.labelOffsets[viewType].x : (item.type === 'SOURCE' ? -(itemW / 2) : 0);
              const labelOffsetY = item.labelOffsets?.[viewType]?.y !== undefined ? item.labelOffsets[viewType].y : defaultOffsetY;

              let isBeamInFront = false;
              if (item.type === 'VFM' && viewType === 'TOP' && item.slopeSide < 0) isBeamInFront = true;
              if (item.type === 'HFM' && viewType === 'SIDE' && item.slopeTop > 0) isBeamInFront = true;

              let zIndex = 20;
              if (item.type === 'HUTCH') {
                zIndex = isSelected ? 5 : 0;
              } else if (isSelected) {
                zIndex = 40;
              } else if (isBeamInFront) {
                zIndex = 5;
              } else {
                zIndex = 20;
              }

              const zIndexClass = `z-[${zIndex}] hover:z-[50]`;
              const resizeHandlePos = viewType === 'SIDE' ? { right: '-6px', top: '-6px', cursor: 'nesw-resize' } : { right: '-6px', bottom: '-6px', cursor: 'nwse-resize' };
              
              const labelVisible = item.showLabel !== false;

              return (
                <div
                  key={item.id}
                  className={`absolute ${zIndexClass}`}
                  style={{
                    left: item.x,
                    top: item[planeCoord],
                    zIndex: zIndex,
                    transition: isDraggingThis ? 'none' : 'left 0.1s ease-out, top 0.1s ease-out'
                  }}
                >
                  <div
                    onPointerDown={(e) => handlePointerDown(e, item.id, viewType, refObj)}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute ${placingType ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'} ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : 'hover:ring-2 hover:ring-gray-400 hover:ring-offset-1'}`}
                    style={{
                      width: itemW,
                      height: itemH,
                      transformOrigin: transformOrigin,
                      transform: `${transformOffset} rotate(${rotation}rad)`,
                      transition: isDraggingThis ? 'none' : 'transform 0.1s ease-out, width 0.1s ease-out, height 0.1s ease-out'
                    }}
                  >
                    <OpticalComponent item={item} viewType={viewType} tracePoints={tracePoints} theme={theme} isDarkMode={isDarkMode} />
                    
                    {isSelected && ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type) && (
                      <div 
                        className="absolute w-3 h-3 bg-blue-500 border border-white z-[60]"
                        style={resizeHandlePos}
                        onPointerDown={(e) => handleResizePointerDown(e, item.id, viewType)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>

                  {labelVisible && (
                    <div 
                      className={`absolute whitespace-nowrap text-[9px] px-1 py-0.5 pointer-events-auto transition-opacity ${isEditing ? 'z-30 cursor-text' : 'z-20 cursor-grab active:cursor-grabbing hover:text-blue-500'} ${placingType ? 'pointer-events-none' : ''}`}
                      style={{ 
                        transform: 'translateX(-50%)',
                        left: labelOffsetX,
                        top: labelOffsetY,
                        color: isDarkMode ? '#cbd5e1' : '#334155',
                        textShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)'
                      }}
                      onPointerDown={(e) => {
                        if (isEditing) e.stopPropagation();
                        else handleLabelPointerDown(e, item.id, viewType);
                      }}
                      onDoubleClick={(e) => handleLabelDoubleClick(e, item.id, labelName)}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          value={editingLabel.text}
                          onChange={(e) => setEditingLabel({ ...editingLabel, text: e.target.value })}
                          onBlur={(e) => {
                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, customName: e.target.value } : i));
                            setEditingLabel(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, customName: e.target.value } : i));
                              setEditingLabel(null);
                            }
                            if (e.key === 'Escape') setEditingLabel(null);
                          }}
                          className="bg-transparent border-b border-blue-500 outline-none text-center p-0 m-0 text-[9px] select-text"
                          style={{ 
                            color: isDarkMode ? '#60a5fa' : '#2563eb',
                            textShadow: 'none',
                            width: `${Math.max(editingLabel.text.length * 7, 30)}px` 
                          }}
                        />
                      ) : (
                        labelName
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {placingType && ghostPos?.view === viewType && (() => {
               const conf = TYPES[placingType];
               const mockItem = { 
                 type: placingType, 
                 orientation: 'Vertical', 
                 tiltAngle: 45,
                 dimX: placingType === 'HUTCH' ? 200 : (placingType === 'WALL' ? 24 : conf.width),
                 dimY: placingType === 'HUTCH' ? 140 : (placingType === 'WALL' ? 140 : conf.height),
                 dimZ: placingType === 'HUTCH' ? 140 : (placingType === 'WALL' ? 140 : conf.height),
                 passLight: true,
                 detectorType: 'Silicon Detector'
               };
               const isGratingActive = placingType === 'GRATING' && ((viewType === 'SIDE' && mockItem.orientation === 'Vertical') || (viewType === 'TOP' && mockItem.orientation === 'Horizontal'));
               const isSimpleMirrorActive = (placingType === 'VFM' && viewType === 'SIDE') || (placingType === 'HFM' && viewType === 'TOP') || isGratingActive;

               let transformOrigin = isSimpleMirrorActive ? '50% 0%' : '50% 50%';
               let transformOffset = isSimpleMirrorActive ? 'translate(-50%, 0%)' : 'translate(-50%, -50%)';
               if (placingType === 'SOURCE') {
                   transformOrigin = '100% 50%';
                   transformOffset = 'translate(-100%, -50%)';
               }

               const itemW = mockItem.dimX;
               const itemH = viewType === 'SIDE' ? mockItem.dimY : mockItem.dimZ; 
               
               const ghostDist = parseFloat(((ghostPos.x - ORIGIN_X) / PX_PER_M).toFixed(1));
               const ghostSnappedX = ORIGIN_X + ghostDist * PX_PER_M;

               let ghostY = ghostPos.y;
               if (['WALL', 'HUTCH', 'CHAMBER'].includes(placingType)) {
                  if (placingType === 'CHAMBER') {
                    ghostY = 150; // Always snap to beam path
                  } else if (viewType === 'SIDE') {
                    ghostY = 200 - itemH / 2; // Floor snap
                  }
               }

               let rotation = 0;
               if (placingType === 'GRATING' && isGratingActive) {
                   rotation = -45 * Math.PI / 180;
               }

               return (
                 <div
                   className="absolute z-50 opacity-50 pointer-events-none drop-shadow-md"
                   style={{
                     left: ghostSnappedX,
                     top: ghostY,
                     width: itemW,
                     height: itemH,
                     transformOrigin,
                     transform: `${transformOffset} rotate(${rotation}rad)`
                   }}
                 >
                   <OpticalComponent item={mockItem} viewType={viewType} tracePoints={[]} theme={theme} isDarkMode={isDarkMode} />
                 </div>
               );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
