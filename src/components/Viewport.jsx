import React, { useState, useRef, useEffect } from 'react';
import { Layers, Grid, Magnet, Ruler } from 'lucide-react';
import { OpticalComponent } from './OpticalComponent';
import { TYPES, ORIGIN_X, PX_PER_M, PX_PER_MM_V, GRID_SIZE } from '../constants';
import { getOpticPhysicalLengthM, getItemBoundsM, calculateUpdatedBounds } from '../utils/constructionUtils';
import { getItemVisualHeight } from '../utils';

export const Viewport = ({ 
  viewType, title, refObj, scrollRef, planeCoord, tracePoints, tracePointsBranch = [], theme, 
  draggingInfo, placingType, pan, zoom, showGrid, showRuler, showAnnotations = true, canvasWidth, 
  isDarkMode, computedItems, selectedId, setSelectedId, editingLabel, rayColor, 
  rayWidth, rayStyle, showArrow, sourceItem, handleBgPointerDown, 
  handlePointerMove, handlePointerUp, handleWheel, handlePointerDown, 
  handleResizePointerDown, handleLabelPointerDown, handleLabelDoubleClick,
  cancelFocusItem, setEditingLabel, setItems, ghostPos, ghostBranch, setGhostBranch, canvasSettings
}) => {
  const [branchFilter, setBranchFilter] = useState('all'); // 'all' | 'straight' | 'diffracted'
  const [editingAnnotation, setEditingAnnotation] = useState(null); // { id, text, posX, badgeY }
  const lastAnnotClickRef = useRef({});
  const lastLabelClickRef = useRef({});
  const lastCompClickRef = useRef({});
  const annotOpenTimeRef = useRef(0);
  const labelOpenTimeRef = useRef(0);
  const hasSelectedAnnotRef = useRef(false);
  const hasSelectedLabelRef = useRef(false);

  const annotInputRef = (el) => {
    if (el && !hasSelectedAnnotRef.current) {
      hasSelectedAnnotRef.current = true;
      el.focus();
      el.select();
    }
  };

  const labelInputRef = (el) => {
    if (el && !hasSelectedLabelRef.current) {
      hasSelectedLabelRef.current = true;
      el.focus();
      el.select();
    }
  };

  const startEditingAnnotation = (e, item, posX, badgeY) => {
    e?.stopPropagation?.();
    cancelFocusItem?.();
    setEditingLabel?.(null);
    hasSelectedAnnotRef.current = false;
    annotOpenTimeRef.current = Date.now();
    setSelectedId?.(item.id);
    const distVal = item.distance !== undefined ? item.distance : (posX - ORIGIN_X) / PX_PER_M;
    setEditingAnnotation({
      id: item.id,
      text: String(parseFloat(Number(distVal).toFixed(3))),
      posX,
      badgeY
    });
  };

  const commitAnnotationEdit = () => {
    if (!editingAnnotation) return;
    const cleanStr = String(editingAnnotation.text).replace(/m$/i, '').trim();
    const num = parseFloat(cleanStr);
    if (!isNaN(num)) {
      setItems(prev => prev.map(i => {
        if (i.id === editingAnnotation.id) {
          const constraint = i.lockLength ? 'LOCK_LENGTH' : (i.lockCenter ? 'LOCK_CENTER' : 'ADJUST_LENGTH');
          return calculateUpdatedBounds(i, 'distance', num, constraint);
        }
        return i;
      }).sort((a, b) => (a.distance || 0) - (b.distance || 0)));
    }
    setEditingAnnotation(null);
    hasSelectedAnnotRef.current = false;
  };

  // Pre-calculate stagger layout for annotations
  const layoutItems = React.useMemo(() => {
    if (!showAnnotations) return [];
    const candidateItems = (computedItems || []).filter(
      (item) => !item.isBranchHidden &&
                !['WALL', 'HUTCH', 'CHAMBER', 'ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type) &&
                item.detectorType !== 'Virtual Anchor' &&
                !item.isInvisible &&
                !(item.type === 'ANCHOR_SIDE' && viewType === 'TOP') &&
                !(item.type === 'ANCHOR_TOP' && viewType === 'SIDE')
    );

    const sortedAnnotations = candidateItems.map((item) => {
      const isSelected = selectedId === item.id;
      const elemY = viewType === 'SIDE' ? (item.y ?? 150) : (item.z ?? 150);
      const itemH = getItemVisualHeight(item, viewType);
      const targetY = elemY > 65 ? (elemY - itemH / 2) : (elemY + itemH / 2);

      const posX = item.x;
      const distVal = item.distance !== undefined
        ? item.distance
        : (posX - ORIGIN_X) / PX_PER_M;
      const labelText = `${parseFloat(Number(distVal).toFixed(2))}m`;
      const annotSize = canvasSettings?.annotationTextSize ?? 9;
      const badgeWidth = Math.max(Math.round(annotSize * 3), Math.round(labelText.length * (annotSize * 0.72) + 6));
      const badgeHeight = Math.max(8, annotSize + 4);

      return {
        item,
        isSelected,
        elemY,
        itemH,
        targetY,
        posX,
        labelText,
        badgeWidth,
        badgeHeight,
        annotSize,
        left: posX - badgeWidth / 2,
        right: posX + badgeWidth / 2
      };
    }).sort((a, b) => a.posX - b.posX);

    const levelEndPositions = [];
    const minGap = 6;

    return sortedAnnotations.map((annot) => {
      let assignedLevel = -1;
      for (let lvl = 0; lvl < levelEndPositions.length; lvl++) {
        if (annot.left >= levelEndPositions[lvl] + minGap) {
          assignedLevel = lvl;
          break;
        }
      }

      if (assignedLevel === -1) {
        assignedLevel = levelEndPositions.length;
        levelEndPositions.push(annot.right);
      } else {
        levelEndPositions[assignedLevel] = annot.right;
      }

      const stepY = (annot.badgeHeight || 15) + 3;
      const badgeBottom = 38 - assignedLevel * stepY;
      const badgeY = badgeBottom - (annot.badgeHeight || 15);

      return { ...annot, level: assignedLevel, badgeBottom, badgeY };
    });
  }, [showAnnotations, computedItems, selectedId, viewType, canvasSettings]);

  const isPanning = draggingInfo?.type === 'pan' && draggingInfo?.view === viewType;
  const isWheelingRef = useRef(false);
  const wheelTimeoutRef = useRef(null);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevTransformRef = useRef({ x: pan[viewType]?.x, y: pan[viewType]?.y, zoom });
  const transitionTimerRef = useRef(null);

  useEffect(() => {
    const prev = prevTransformRef.current;
    const curX = pan[viewType]?.x;
    const curY = pan[viewType]?.y;
    const curZoom = zoom;

    const hasChanged = prev.x !== curX || prev.y !== curY || prev.zoom !== curZoom;
    prevTransformRef.current = { x: curX, y: curY, zoom: curZoom };

    if (hasChanged && !isPanning && !isWheelingRef.current && !draggingInfo) {
      setIsTransitioning(true);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 200);
    }
  }, [pan, zoom, viewType, isPanning, draggingInfo]);

  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  let strokeDasharray = 'none';
  if (rayStyle === 'dashed') strokeDasharray = '8,4';
  if (rayStyle === 'dotted') strokeDasharray = '2,4';

  const isItemDimmedByBranch = (item) => {
    if (branchFilter === 'all') return false;
    if (!item || ['WALL', 'HUTCH', 'CHAMBER', 'VSPLIT', 'HSPLIT'].includes(item.type)) return false;
    const splitterBefore = (computedItems || []).some(it => 
      (it.type === 'VSPLIT' || it.type === 'HSPLIT') && (it.distance || 0) <= (item.distance || 0)
    );
    if (!splitterBefore) return false;

    const itemBranch = item.branch || 'straight';
    if (branchFilter === 'straight' && itemBranch === 'diffracted') return true;
    if (branchFilter === 'diffracted' && itemBranch === 'straight') return true;
    return false;
  };

  // Helper to interpolate coordinate at x along a trace points array
  const getRayCoordAtX = (pts, x, coord) => {
    if (!pts || pts.length === 0) return null;
    if (pts.length === 1) return pts[0][coord] ?? 150;
    if (x <= pts[0].x) return pts[0][coord] ?? 150;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      if (x >= p1.x && x <= p2.x) {
        if (p2.x === p1.x) return p1[coord] ?? 150;
        const v1 = p1[coord] ?? 150;
        const v2 = p2[coord] ?? 150;
        return v1 + (v2 - v1) * ((x - p1.x) / (p2.x - p1.x));
      }
    }
    const p1 = pts[pts.length - 2];
    const p2 = pts[pts.length - 1];
    if (p2.x === p1.x) return p2[coord] ?? 150;
    const v1 = p1[coord] ?? 150;
    const v2 = p2[coord] ?? 150;
    return v1 + (v2 - v1) * ((x - p1.x) / (p2.x - p1.x));
  };

  const getRaySlopeAtX = (pts, x, coord) => {
    if (!pts || pts.length < 2) return 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      if (x >= p1.x && x <= p2.x) {
        const v1 = p1[coord] ?? 150;
        const v2 = p2[coord] ?? 150;
        return Math.atan2(v2 - v1, p2.x - p1.x);
      }
    }
    const p1 = pts[pts.length - 2];
    const p2 = pts[pts.length - 1];
    const v1 = p1[coord] ?? 150;
    const v2 = p2[coord] ?? 150;
    return Math.atan2(v2 - v1, p2.x - p1.x);
  };

  // Branch auto-snap calculation for ghost preview
  let activeGhostBranch = null;
  let activeGhostSnappedY = ghostPos?.y;
  let activeGhostBranchSlope = 0;

  if (placingType && ghostPos?.view === viewType && !['WALL', 'HUTCH', 'CHAMBER'].includes(placingType)) {
    const ghostDist = parseFloat(((ghostPos.x - ORIGIN_X) / PX_PER_M).toFixed(1));
    const ghostSnappedX = ORIGIN_X + ghostDist * PX_PER_M;
    const hasSplitterUpstream = (computedItems || []).some(
      it => (it.type === 'VSPLIT' || it.type === 'HSPLIT') && (it.distance || 0) <= ghostDist
    );

    if (hasSplitterUpstream) {
      const yStraight = getRayCoordAtX(tracePoints, ghostSnappedX, planeCoord);
      const yBranch = tracePointsBranch && tracePointsBranch.length >= 2
        ? getRayCoordAtX(tracePointsBranch, ghostSnappedX, planeCoord)
        : null;

      const distToBranch = yBranch !== null ? Math.abs(ghostPos.y - yBranch) : Infinity;
      const distToStraight = yStraight !== null ? Math.abs(ghostPos.y - yStraight) : Infinity;

      // Snap within ±10 px threshold
      if (distToBranch <= 10 && distToBranch <= distToStraight) {
        activeGhostSnappedY = yBranch;
        activeGhostBranch = 'diffracted';
        activeGhostBranchSlope = getRaySlopeAtX(tracePointsBranch, ghostSnappedX, planeCoord);
      } else if (distToStraight <= 10) {
        activeGhostSnappedY = yStraight;
        activeGhostBranch = 'straight';
      }
    }
  }

  useEffect(() => {
    if (placingType && ghostPos?.view === viewType) {
      if (ghostBranch !== activeGhostBranch) {
        setGhostBranch?.(activeGhostBranch);
      }
    }
  }, [placingType, ghostPos?.view, ghostPos?.x, ghostPos?.y, viewType, activeGhostBranch, ghostBranch, setGhostBranch]);

  return (
    <div className="flex-1 flex flex-col relative border-b-2 overflow-hidden" style={{ borderColor: theme.inactiveBorder, backgroundColor: theme.bg }}>
      {(() => {
        const hasSplitter = (computedItems || []).some(item => item.type === 'VSPLIT' || item.type === 'HSPLIT');
        return (
          <div className={`absolute top-4 left-4 z-20 backdrop-blur px-3 py-1.5 shadow-sm border flex items-center gap-3 rounded-none ${theme.badgeBg}`}>
            <div className="flex items-center gap-2">
              <Layers size={16} className={theme.text} />
              <span className={`font-bold text-sm tracking-wide ${theme.text}`}>{title}</span>
            </div>
            {hasSplitter && (
              <div className="flex items-center gap-1 pl-2 border-l border-slate-300 dark:border-slate-700 text-xs">
                <span className="text-[10px] opacity-70 uppercase tracking-wider font-bold mr-1">Branch:</span>
                {(['all', 'straight', 'diffracted']).map((bf) => (
                  <button
                    key={bf}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBranchFilter(bf);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                      branchFilter === bf
                        ? (bf === 'diffracted'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : (bf === 'straight' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'))
                        : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100'
                    }`}
                    title={bf === 'all' ? 'Show both straight and diffracted branches' : (bf === 'straight' ? 'Focus only on straight passthrough beam' : 'Focus only on diffracted split branch')}
                  >
                    {bf === 'all' ? 'Both' : (bf === 'straight' ? 'Straight' : 'Diffracted')}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}
      
      <div 
        ref={scrollRef}
        className={`flex-1 relative overflow-hidden ${placingType ? 'cursor-crosshair' : (isPanning ? 'cursor-grabbing' : 'cursor-grab')}`} 
        style={{ backgroundColor: theme.canvasBg }} 
        onPointerDown={(e) => {
          if (e.button === 0) {
            try {
              e.currentTarget.setPointerCapture?.(e.pointerId);
            } catch (err) {}
          }
          handleBgPointerDown(e, viewType);
        }}
        onPointerMove={(e) => handlePointerMove(e, viewType, refObj)}
        onPointerUp={(e) => {
          try {
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
              e.currentTarget.releasePointerCapture?.(e.pointerId);
            }
          } catch (err) {}
          handlePointerUp();
        }}
        onPointerCancel={(e) => {
          try {
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
              e.currentTarget.releasePointerCapture?.(e.pointerId);
            }
          } catch (err) {}
          handlePointerUp();
        }}
        onWheel={(e) => {
          isWheelingRef.current = true;
          if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
          wheelTimeoutRef.current = setTimeout(() => {
            isWheelingRef.current = false;
          }, 90);
          handleWheel(e, viewType, scrollRef);
        }}
      >
        <div 
          className="absolute inset-0"
          onTransitionEnd={() => {
            if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
            setIsTransitioning(false);
          }}
          style={{
            transform: `translate(${Math.round(pan[viewType].x)}px, ${Math.round(pan[viewType].y)}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isTransitioning && !isPanning && !isWheelingRef.current && !draggingInfo
              ? 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
              : 'none'
          }}
        >
          <div style={{
            position: 'absolute',
            left: -48000, top: -48000, width: 96000, height: 96000,
            backgroundImage: showGrid ? theme.grid : 'none',
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
          }} />

          <svg 
            width={canvasWidth || 50000} 
            height={1000}
            style={{ 
              position: 'absolute', 
              left: 0, 
              top: 0, 
              width: `${canvasWidth || 50000}px`, 
              height: '1000px', 
              overflow: 'visible', 
              zIndex: 35, 
              pointerEvents: 'none' 
            }}
          >
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
                {/* Horizontal Meter Ruler (at top) */}
                <line x1="0" y1="65" x2={canvasWidth} y2="65" stroke={isDarkMode ? '#334155' : '#cbd5e1'} strokeWidth="1.5" />
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
                          x1={x} y1="65" 
                          x2={x} y2={isMajor ? "55" : "60"} 
                          stroke={isDarkMode ? '#334155' : '#cbd5e1'} 
                          strokeWidth={isMajor ? "1.5" : "1"} 
                        />
                        {isMajor && (
                          <text 
                            x={x} y="52" 
                            fill={isDarkMode ? '#94a3b8' : '#475569'} 
                            fontSize={canvasSettings?.rulerTextSize ?? 10} 
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

                {/* Vertical Millimeter Ruler (Left margin: 1 unit grid = 20px = 100mm) */}
                {(() => {
                  const vRulerX = 65;
                  const vTicks = [];
                  const tickColor = isDarkMode ? '#334155' : '#cbd5e1';
                  const textColor = isDarkMode ? '#94a3b8' : '#475569';
                  const fontSize = canvasSettings?.rulerTextSize ?? 10;

                  // Vertical ruler axis header
                  vTicks.push(
                    <text
                      key="v-ruler-title"
                      x={vRulerX - 6}
                      y="58"
                      fill={isDarkMode ? '#64748b' : '#94a3b8'}
                      fontSize="9"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      {viewType === 'SIDE' ? 'ELEV (Y)' : 'OFFSET (Z)'}
                    </text>
                  );

                  // Vertical ruler baseline
                  vTicks.push(
                    <line 
                      key="v-ruler-line"
                      x1={vRulerX} y1="65" 
                      x2={vRulerX} y2="235" 
                      stroke={tickColor} 
                      strokeWidth="1.5" 
                    />
                  );

                  // Zero beamline indicator line towards ORIGIN_X
                  vTicks.push(
                    <line
                      key="v-ruler-zero-guide"
                      x1={vRulerX} y1="150"
                      x2={ORIGIN_X - 10} y2="150"
                      stroke={isDarkMode ? '#1e3a8a' : '#bfdbfe'}
                      strokeWidth="1"
                      strokeDasharray="2,3"
                      opacity="0.7"
                    />
                  );

                  // Ticks for mm: +200 mm, +150 mm, +100 mm, +50 mm, 0 mm, -50 mm, -100 mm, -150 mm, -200 mm
                  // Minor ticks every 25 mm, major ticks and labels every 50 mm (1 unit grid = 20 px)
                  const mmValues = [225, 200, 175, 150, 125, 100, 75, 50, 25, 0, -25, -50, -75, -100, -125, -150, -175, -200, -225];
                  mmValues.forEach((val) => {
                    // In Side View: +Y (higher elevation) is smaller y. 0 mm is at 150 px.
                    // In Top View: +Z (outboard) is larger z. 0 mm is at 150 px.
                    const yPos = viewType === 'SIDE' ? 150 - val * PX_PER_MM_V : 150 + val * PX_PER_MM_V;
                    const isMajor = val % 50 === 0;

                    vTicks.push(
                      <line
                        key={`v-tick-${val}`}
                        x1={vRulerX}
                        y1={yPos}
                        x2={isMajor ? vRulerX + 6 : vRulerX + 3}
                        y2={yPos}
                        stroke={val === 0 ? '#3b82f6' : tickColor}
                        strokeWidth={isMajor ? '1.5' : '1'}
                      />
                    );

                    if (isMajor) {
                      const labelStr = val > 0 ? `+${val} mm` : `${val} mm`;
                      vTicks.push(
                        <text
                          key={`v-text-${val}`}
                          x={vRulerX - 6}
                          y={yPos + 3.5}
                          fill={val === 0 ? '#3b82f6' : textColor}
                          fontSize={fontSize}
                          fontFamily="sans-serif"
                          fontWeight={val === 0 ? 'bold' : 'normal'}
                          textAnchor="end"
                        >
                          {labelStr}
                        </text>
                      );
                    }
                  });

                  return vTicks;
                })()}
              </g>
            )}

            {showAnnotations && (
              <g className="annotations-lines-layer">
                {layoutItems.map((annot) => {
                  const { item, isSelected, targetY, posX, badgeBottom, badgeY } = annot;
                  if (!item || ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type) || item.detectorType === 'Virtual Anchor' || item.isInvisible) return null;
                  if (item.type === 'ANCHOR_SIDE' && viewType === 'TOP') return null;
                  if (item.type === 'ANCHOR_TOP' && viewType === 'SIDE') return null;
                  const strokeColor = isSelected ? '#3b82f6' : (isDarkMode ? '#475569' : '#cbd5e1');
                  return (
                    <g key={`annotation-lines-${item.id}`} opacity={isSelected ? 1 : 0.75}>
                      {/* Invisible wider hit-testing line for easy double-click on leader line */}
                      <line
                        x1={posX} y1={targetY}
                        x2={posX} y2={badgeBottom}
                        stroke="transparent"
                        strokeWidth="16"
                        className="cursor-pointer"
                        style={{ pointerEvents: 'stroke' }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          cancelFocusItem?.();
                          const now = Date.now();
                          const lastClick = lastAnnotClickRef.current[item.id] || 0;
                          if (now - lastClick < 500) {
                            lastAnnotClickRef.current[item.id] = 0;
                            startEditingAnnotation(e, item, posX, badgeY);
                            return;
                          }
                          lastAnnotClickRef.current[item.id] = now;
                          setSelectedId?.(item.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          cancelFocusItem?.();
                          startEditingAnnotation(e, item, posX, badgeY);
                        }}
                      />

                      {/* 1. Dashed vertical leader line: element centre → badge bottom */}
                      <line
                        x1={posX} y1={targetY}
                        x2={posX} y2={badgeBottom}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? "1.5" : "1"}
                        strokeDasharray="2,2"
                        style={{ pointerEvents: 'none' }}
                      />

                      {/* 2. Tick mark on the ruler baseline */}
                      <line
                        x1={posX - 2.5} y1="65"
                        x2={posX + 2.5} y2="65"
                        stroke={strokeColor} 
                        strokeWidth={isSelected ? "1.5" : "1"}
                        style={{ pointerEvents: 'none' }}
                      />

                      {/* 3. Dot at the element's touch point */}
                      <circle
                        cx={posX} cy={targetY}
                        r={isSelected ? "2.5" : "1.5"}
                        fill={strokeColor}
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Straight ray path */}
            {(branchFilter === 'all' || branchFilter === 'straight') && tracePoints.length > 1 && (
              <path
                d={`M ${tracePoints.map(p => `${p.x},${p[planeCoord]}`).join(' L ')}`}
                fill="none" stroke={rayColor} strokeWidth={rayWidth}
                strokeLinecap="round" strokeLinejoin="round"
                style={{
                  strokeDasharray,
                  animation: (sourceItem.animate !== false && rayStyle !== 'solid') ? 'dash 4.5s linear infinite' : 'none',
                  willChange: (sourceItem.animate !== false && rayStyle !== 'solid') ? 'stroke-dashoffset' : 'auto'
                }}
              />
            )}
            {/* Diffracted branch ray path */}
            {(branchFilter === 'all' || branchFilter === 'diffracted') && tracePointsBranch && tracePointsBranch.length > 1 && (
              <path
                d={`M ${tracePointsBranch.map(p => `${p.x},${p[planeCoord]}`).join(' L ')}`}
                fill="none" stroke="#f59e0b" strokeWidth={rayWidth}
                strokeLinecap="round" strokeLinejoin="round"
                style={{
                  strokeDasharray: rayStyle === 'dotted' ? '2,4' : '8,4',
                  animation: (sourceItem.animate !== false && rayStyle !== 'solid') ? 'dash 4.5s linear infinite' : 'none',
                  willChange: (sourceItem.animate !== false && rayStyle !== 'solid') ? 'stroke-dashoffset' : 'auto'
                }}
              />
            )}
            {/* Straight ray arrows */}
            {(branchFilter === 'all' || branchFilter === 'straight') && showArrow && tracePoints.slice(0, -1).map((p, i) => {
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
            {/* Diffracted branch arrows */}
            {(branchFilter === 'all' || branchFilter === 'diffracted') && showArrow && tracePointsBranch && tracePointsBranch.slice(0, -1).map((p, i) => {
              const next = tracePointsBranch[i + 1];
              const midX = (p.x + next.x) / 2;
              const midY = (p[planeCoord] + next[planeCoord]) / 2;
              const angle = Math.atan2(next[planeCoord] - p[planeCoord], next.x - p.x) * (180 / Math.PI);
              return (
                <g key={`arrow-branch-${i}`} transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
                  <polygon points="-4,-3 4,0 -4,3" fill="#f59e0b" />
                </g>
              );
            })}
          </svg>

          {/* HTML ANNOTATION BADGES & INLINE EDIT OVERLAYS */}
          {showAnnotations && (
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 45 }}>
              {layoutItems.map((annot) => {
                const { item, isSelected, posX, labelText, badgeWidth, badgeHeight, badgeY } = annot;
                if (!item || ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type) || item.detectorType === 'Virtual Anchor' || item.isInvisible) return null;
                if (item.type === 'ANCHOR_SIDE' && viewType === 'TOP') return null;
                if (item.type === 'ANCHOR_TOP' && viewType === 'SIDE') return null;
                if (isItemDimmedByBranch(item)) return null;
                const isEditingThis = editingAnnotation?.id === item.id;

                if (isEditingThis) {
                  return (
                    <div
                      key={`annot-edit-${item.id}`}
                      className="absolute pointer-events-auto z-[60]"
                      style={{
                        left: `${posX}px`,
                        top: `${badgeY}px`,
                        transform: 'translate(-50%, -2px)',
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                    >
                      <input
                        ref={annotInputRef}
                        type="text"
                        value={editingAnnotation.text}
                        onChange={(e) => setEditingAnnotation(prev => prev ? { ...prev, text: e.target.value } : null)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          if (Date.now() - annotOpenTimeRef.current < 300) {
                            e.target.focus();
                            return;
                          }
                          commitAnnotationEdit();
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') {
                            commitAnnotationEdit();
                          } else if (e.key === 'Escape') {
                            setEditingAnnotation(null);
                            hasSelectedAnnotRef.current = false;
                          }
                        }}
                        onKeyUp={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 text-center font-mono font-bold text-xs bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-2 border-blue-500 rounded shadow-lg outline-none select-text ring-2 ring-blue-400/40"
                        style={{
                          width: `${Math.max(68, ((editingAnnotation.text || '').length + 3) * 8.5)}px`,
                          height: '24px'
                        }}
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={`annot-badge-${item.id}`}
                    className={`absolute pointer-events-auto cursor-pointer select-none px-1.5 py-0 rounded text-center font-mono font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-500/15 border border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/30 z-[48]'
                        : 'bg-transparent border border-transparent hover:text-blue-500 hover:border-blue-400/40 hover:bg-blue-500/10 z-[36]'
                    }`}
                    style={{
                      left: `${posX}px`,
                      top: `${badgeY}px`,
                      transform: 'translate(-50%, 0)',
                      fontSize: `${annot.annotSize ?? 9}px`,
                      height: `${badgeHeight}px`,
                      lineHeight: `${badgeHeight - 2}px`,
                      minWidth: `${badgeWidth}px`,
                      whiteSpace: 'nowrap',
                      color: isSelected 
                        ? (isDarkMode ? '#60a5fa' : '#2563eb')
                        : (isDarkMode ? '#cbd5e1' : '#1e293b'),
                      textShadow: isDarkMode 
                        ? '0 1px 2px rgba(0,0,0,0.8)' 
                        : '0 1px 1px rgba(255,255,255,0.8)'
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      cancelFocusItem?.();
                      const now = Date.now();
                      const lastClick = lastAnnotClickRef.current[item.id] || 0;
                      if (now - lastClick < 500) {
                        lastAnnotClickRef.current[item.id] = 0;
                        startEditingAnnotation(e, item, posX, badgeY);
                        return;
                      }
                      lastAnnotClickRef.current[item.id] = now;
                      setSelectedId?.(item.id);
                    }}
                    onPointerUp={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      cancelFocusItem?.();
                      startEditingAnnotation(e, item, posX, badgeY);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId?.(item.id);
                    }}
                  >
                    {labelText}
                  </div>
                );
              })}
            </div>
          )}

          <div 
            ref={refObj} 
            className="absolute inset-0 pointer-events-none" 
            style={{ width: `${canvasWidth}px`, height: '1000px' }}
          >
            {computedItems.map((item) => {
              if (item.type === 'ANCHOR_SIDE' && viewType === 'TOP') return null;
              if (item.type === 'ANCHOR_TOP' && viewType === 'SIDE') return null;
              const conf = TYPES[item.type] || { width: 8, height: 8 };
              const isSelected = selectedId === item.id;
              const isDraggingThis = draggingInfo?.id === item.id && draggingInfo.type === 'component';
              const isEditing = editingLabel?.id === item.id && (!editingLabel.view || editingLabel.view === viewType);
              
              const isGratingActive = item.type === 'GRATING' && ((viewType === 'SIDE' && (item.orientation || 'Vertical') === 'Vertical') || (viewType === 'TOP' && item.orientation === 'Horizontal'));
              const isSimpleMirrorActive = (item.type === 'VFM' && viewType === 'SIDE') || (item.type === 'HFM' && viewType === 'TOP') || isGratingActive;
              
              const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
              const isDCM = item.type === 'VDCM' || item.type === 'HDCM';
              const isSource = item.type === 'SOURCE';

              const bounds = getItemBoundsM(item);
              const physLengthM = bounds.physLen;

              const isAnchorType = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type);
              const isVirtualAnchor = isAnchorType || (item.type === 'DETECTOR' && (item.detectorType === 'Virtual Anchor' || item.isInvisible));

              // Visual width of component graphic:
              // Physical length visualizes the optics itself on the canvas!
              // Range elements (WALL/HUTCH/CHAMBER) scale with their span.
              // SOURCE scales with its physical length.
              // DCM display box matches chamber/footprint box size:
              const itemW = isVirtualAnchor
                ? 8
                : (isDCM
                  ? Math.max(4, bounds.len * PX_PER_M)
                  : ((isRange || isSource)
                    ? (item.dimX ?? conf.width)
                    : Math.max(6, physLengthM * PX_PER_M)));
              const itemH = isVirtualAnchor ? 8 : getItemVisualHeight(item, viewType);

              // Chamber footprint box envelope (dashed bounding box)
              const globalShowFootprints = canvasSettings?.showFootprintBoxes !== false;
              const showFootprintBox = !isAnchorType && !isRange && !isVirtualAnchor && Boolean(item.showFootprint) && globalShowFootprints;
              const showFootprintText = item.showFootprintText !== false && canvasSettings?.showFootprintText !== false;
              const footprintW = Math.max(4, bounds.len * PX_PER_M);
              const footprintH = isDCM ? itemH : Math.max(itemH + 14, 28);
              // Asymmetric chamber offset from optic center
              const deltaBoxPx = isSource ? 0 : (((bounds.start + bounds.end) / 2) - bounds.dist) * PX_PER_M;
              let chamberBoxTop = 0;
              if (isSimpleMirrorActive) {
                chamberBoxTop = itemH / 2;
              } else if (isDCM) {
                const parsedOffset = parseFloat(item.exitOffset);
                const offset_mm = !isNaN(parsedOffset) ? (parsedOffset > 0 && parsedOffset <= 1.0 ? parsedOffset * 100 : parsedOffset) : 25;
                const isDcmActivePlane = (item.type === 'VDCM' && viewType === 'SIDE') || (item.type === 'HDCM' && viewType === 'TOP');
                const D_px = isDcmActivePlane ? (offset_mm * PX_PER_MM_V) : 0;
                chamberBoxTop = -D_px / 2;
              }

              let rotation = 0;
              const isDiffBranch = item.branch === 'diffracted';
              const activeTrace = (isDiffBranch ? tracePointsBranch : tracePoints) || [];

              if (item.type === 'GRATING' || isSimpleMirrorActive) {
                  const pIdx = activeTrace.findIndex(p => p.parentId === item.id);
                  if (pIdx > 0 && pIdx < activeTrace.length - 1) {
                      const p = activeTrace[pIdx];
                      const prev = activeTrace[pIdx - 1];
                      const next = activeTrace[pIdx + 1];
                      const py = p[planeCoord] ?? 150;
                      const prevy = prev[planeCoord] ?? 150;
                      const nexty = next[planeCoord] ?? 150;
                      const angleIn = Math.atan2(py - prevy, p.x - prev.x);
                      const angleOut = Math.atan2(nexty - py, next.x - p.x);
                      rotation = (angleIn + angleOut) / 2;
                      if (angleIn < angleOut) rotation += Math.PI;
                      if (item.type === 'GRATING') {
                          rotation -= (parseFloat(item.tiltAngle) ?? 0) * Math.PI / 180;
                      }
                  } else if (pIdx > 0) {
                      const p = activeTrace[pIdx];
                      const prev = activeTrace[pIdx - 1];
                      const py = p[planeCoord] ?? 150;
                      const prevy = prev[planeCoord] ?? 150;
                      rotation = Math.atan2(py - prevy, p.x - prev.x);
                  } else if (item.type === 'GRATING' && isGratingActive) {
                      rotation = -(parseFloat(item.tiltAngle) ?? 0) * Math.PI / 180;
                  } else if (isDiffBranch) {
                      rotation = getRaySlopeAtX(tracePointsBranch, item.x, planeCoord);
                  }
              } else if (isDiffBranch && !['WALL', 'HUTCH', 'CHAMBER', 'VSPLIT', 'HSPLIT', 'ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type)) {
                  // All optics on diffracted branch rotate along the branch slope as the new 0° axis
                  rotation = getRaySlopeAtX(tracePointsBranch, item.x, planeCoord);
              }

              let dcmAnchorX = 0;
              let dcmAnchorY = 0;
              if (isDCM) {
                const parsedOffset = parseFloat(item.exitOffset);
                const offset_mm = !isNaN(parsedOffset) ? (parsedOffset > 0 && parsedOffset <= 1.0 ? parsedOffset * 100 : parsedOffset) : 25;
                const isDcmActivePlane = (item.type === 'VDCM' && viewType === 'SIDE') || (item.type === 'HDCM' && viewType === 'TOP');
                const D_px = isDcmActivePlane ? (offset_mm * PX_PER_MM_V) : 0;

                dcmAnchorX = (bounds.start !== undefined && bounds.dist !== undefined)
                  ? (bounds.dist - bounds.start) * PX_PER_M
                  : 0.5 * PX_PER_M;
                dcmAnchorY = 20 + D_px / 2;
              }
              let transformOrigin = isSimpleMirrorActive ? '50% 0%' : (isDCM ? `${dcmAnchorX}px ${dcmAnchorY}px` : '50% 50%');
              let transformOffset = isSimpleMirrorActive ? 'translate(-50%, 0%)' : (isDCM ? `translate(-${dcmAnchorX}px, -${dcmAnchorY}px)` : 'translate(-50%, -50%)');
              if (item.type === 'SOURCE') {
                  transformOrigin = '100% 50%';
                  transformOffset = 'translate(-100%, -50%)';
              }

              let defaultName = conf.name;
              if (item.type === 'SOURCE') defaultName = item.sourceType || 'Undulator';
              if (item.type === 'DETECTOR') defaultName = item.detectorType || 'Detector';
              const labelName = item.customName || defaultName;
              
              let defaultOffsetY = isSimpleMirrorActive ? itemH + 8 : (itemH / 2) + 8;
              if (showFootprintBox) {
                defaultOffsetY = Math.max(defaultOffsetY, (footprintH / 2) + 8);
              }
              if (item.type === 'SOURCE') defaultOffsetY = (itemH / 2) + 8;
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
              
              const globalShowLabels = canvasSettings?.showLabels !== false;
              const labelVisible = !isAnchorType && (isEditing || (globalShowLabels && (item.showLabel !== false)));

              const isDimmed = isItemDimmedByBranch(item);

              return (
                <div
                  key={item.id}
                  className={`absolute ${zIndexClass} ${isDimmed ? 'opacity-25 pointer-events-none' : 'pointer-events-auto'}`}
                  style={{
                    left: item.x,
                    top: item[planeCoord],
                    zIndex: isDimmed ? 5 : zIndex,
                    transition: isDraggingThis ? 'none' : 'left 0.1s ease-out, top 0.1s ease-out'
                  }}
                >
                  {/* CHAMBER FOOTPRINT ENVELOPE (DASHED BOX) */}
                  {showFootprintBox && (
                    <div
                      className={`absolute pointer-events-none rounded-none flex items-start justify-center ${isDraggingThis ? '' : 'transition-all duration-150'}`}
                      style={{
                        width: `${footprintW}px`,
                        height: `${footprintH}px`,
                        left: `${deltaBoxPx}px`,
                        top: `${chamberBoxTop}px`,
                        transform: isSource ? 'translate(-100%, -50%)' : 'translate(-50%, -50%)',
                        transition: isDraggingThis ? 'none' : undefined,
                        border: isSelected 
                          ? '1.5px dashed #3b82f6' 
                          : `1px dashed ${isDarkMode ? 'rgba(56, 189, 248, 0.7)' : 'rgba(2, 132, 199, 0.7)'}`,
                        backgroundColor: isSelected 
                          ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.06)') 
                          : (isDarkMode ? 'rgba(56, 189, 248, 0.04)' : 'rgba(2, 132, 199, 0.04)'),
                        zIndex: isSelected ? 30 : 10,
                      }}
                    >
                      {showFootprintText && (
                        <span
                          className="text-[9px] font-mono tracking-tight px-1 py-0 select-none pointer-events-none"
                          style={{
                            transform: 'translateY(-100%)',
                            color: isSelected ? (isDarkMode ? '#60a5fa' : '#2563eb') : (isDarkMode ? '#38bdf8' : '#0284c7'),
                            fontWeight: isSelected ? '700' : '500',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          L: {bounds.len}m
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (isEditing) return;
                      if (e.button === 0) {
                        try {
                          e.currentTarget.setPointerCapture?.(e.pointerId);
                        } catch (err) {}
                      }
                      handlePointerDown(e, item.id, viewType, refObj);
                    }}
                    onPointerMove={(e) => {
                      handlePointerMove(e, viewType, refObj);
                    }}
                    onPointerUp={(e) => {
                      try {
                        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                          e.currentTarget.releasePointerCapture?.(e.pointerId);
                        }
                      } catch (err) {}
                      if (isEditing) return;
                      handlePointerUp();
                    }}
                    onPointerCancel={(e) => {
                      try {
                        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                          e.currentTarget.releasePointerCapture?.(e.pointerId);
                        }
                      } catch (err) {}
                      if (isEditing) return;
                      handlePointerUp();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      cancelFocusItem?.();
                      setEditingAnnotation(null);
                      hasSelectedLabelRef.current = false;
                      labelOpenTimeRef.current = Date.now();
                      handleLabelDoubleClick(e, item.id, labelName, viewType);
                    }}
                    className={`absolute before:absolute before:-inset-3 before:content-[''] select-none ${placingType ? 'pointer-events-none' : (item.isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing')} ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : 'hover:ring-2 hover:ring-gray-400 hover:ring-offset-1'}`}
                    style={{
                      width: itemW,
                      height: itemH,
                      transformOrigin: transformOrigin,
                      transform: `${transformOffset} rotate(${rotation}rad)`,
                      transition: isDraggingThis ? 'none' : 'transform 0.1s ease-out, width 0.1s ease-out, height 0.1s ease-out'
                    }}
                  >
                    <div className="w-full h-full pointer-events-none relative z-10">
                      <OpticalComponent item={item} itemW={itemW} dcmAnchorX={dcmAnchorX} dcmAnchorY={dcmAnchorY} viewType={viewType} tracePoints={tracePoints} theme={theme} isDarkMode={isDarkMode} />
                    </div>
                    
                    {isSelected && ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type) && (
                      <div 
                        className="absolute w-3 h-3 bg-blue-500 border border-white z-[60]"
                        style={resizeHandlePos}
                        onPointerDown={(e) => {
                          if (e.button === 0) {
                            try {
                              e.currentTarget.setPointerCapture?.(e.pointerId);
                            } catch (err) {}
                          }
                          handleResizePointerDown(e, item.id, viewType);
                        }}
                        onPointerUp={(e) => {
                          try {
                            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                              e.currentTarget.releasePointerCapture?.(e.pointerId);
                            }
                          } catch (err) {}
                          handlePointerUp();
                        }}
                        onPointerCancel={(e) => {
                          try {
                            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                              e.currentTarget.releasePointerCapture?.(e.pointerId);
                            }
                          } catch (err) {}
                          handlePointerUp();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>

                  {labelVisible && (
                    <div 
                      className={`absolute whitespace-nowrap px-1 py-0.5 pointer-events-auto transition-opacity ${isEditing ? 'z-50 cursor-text' : 'z-20 cursor-grab active:cursor-grabbing hover:text-blue-500'} ${placingType ? 'pointer-events-none' : ''}`}
                      style={{ 
                        transform: 'translateX(-50%)',
                        left: labelOffsetX,
                        top: labelOffsetY,
                        fontSize: `${canvasSettings?.textSize ?? 10}px`,
                        fontWeight: canvasSettings?.labelBold ? '700' : 'normal',
                        color: isDarkMode ? '#cbd5e1' : '#1e293b',
                        textShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 1px rgba(255,255,255,0.8)'
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (isEditing) {
                          return;
                        }
                        const now = Date.now();
                        const lastClick = lastLabelClickRef.current[item.id] || 0;
                        if (now - lastClick < 500) {
                          lastLabelClickRef.current[item.id] = 0;
                          cancelFocusItem?.();
                          setEditingAnnotation(null);
                          hasSelectedLabelRef.current = false;
                          labelOpenTimeRef.current = Date.now();
                          handleLabelDoubleClick(e, item.id, labelName, viewType);
                          return;
                        }
                        lastLabelClickRef.current[item.id] = now;
                        handleLabelPointerDown(e, item.id, viewType);
                      }}
                      onPointerUp={(e) => {
                        if (isEditing) return;
                        handlePointerUp();
                      }}
                      onPointerCancel={(e) => {
                        if (isEditing) return;
                        handlePointerUp();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        cancelFocusItem?.();
                        setEditingAnnotation(null);
                        hasSelectedLabelRef.current = false;
                        labelOpenTimeRef.current = Date.now();
                        handleLabelDoubleClick(e, item.id, labelName, viewType);
                      }}
                    >
                      {isEditing ? (
                        <input
                          ref={labelInputRef}
                          type="text"
                          value={editingLabel.text}
                          onChange={(e) => setEditingLabel({ ...editingLabel, text: e.target.value })}
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onMouseUp={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onBlur={(e) => {
                            if (Date.now() - labelOpenTimeRef.current < 300) {
                              e.target.focus();
                              return;
                            }
                            const newName = e.target.value.trim() || defaultName;
                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, customName: newName } : i));
                            setEditingLabel(null);
                            hasSelectedLabelRef.current = false;
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              const newName = e.target.value.trim() || defaultName;
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, customName: newName } : i));
                              setEditingLabel(null);
                              hasSelectedLabelRef.current = false;
                            } else if (e.key === 'Escape') {
                              setEditingLabel(null);
                              hasSelectedLabelRef.current = false;
                            }
                          }}
                          onKeyUp={(e) => e.stopPropagation()}
                          className="bg-white dark:bg-slate-800 border-2 border-blue-500 rounded px-2 py-0.5 outline-none text-center shadow-lg select-text ring-2 ring-blue-400/40"
                          style={{ 
                            fontSize: `${canvasSettings?.textSize ?? 10}px`,
                            fontWeight: canvasSettings?.labelBold ? '700' : 'normal',
                            color: isDarkMode ? '#60a5fa' : '#2563eb',
                            minWidth: '60px',
                            width: `${Math.max(((editingLabel.text || '').length) * ((canvasSettings?.textSize ?? 10) * 0.75) + 24, 60)}px` 
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

            {placingType && ghostPos?.view === viewType && !(placingType === 'ANCHOR_SIDE' && viewType === 'TOP') && !(placingType === 'ANCHOR_TOP' && viewType === 'SIDE') && (() => {
               const isDCMPlacing = placingType === 'VDCM' || placingType === 'HDCM';
               const conf = TYPES[placingType] || { width: 8, height: 8 };
               const mockItem = { 
                 type: placingType, 
                 orientation: placingType === 'HSPLIT' ? 'Horizontal' : 'Vertical', 
                 tiltAngle: 45,
                 diffractAngle: 0.5,
                 dimX: placingType === 'HUTCH' ? 200 : (placingType === 'WALL' ? 24 : conf.width),
                 dimY: placingType === 'HUTCH' ? 140 : (placingType === 'WALL' ? 140 : (placingType === 'HFM' ? 20 : conf.height)),
                 dimZ: placingType === 'HUTCH' ? 140 : (placingType === 'WALL' ? 140 : (placingType === 'VFM' ? 20 : (placingType === 'SOURCE' ? 30 : conf.height))),
                 passLight: true,
                 detectorType: 'Silicon Detector',
                 ...(isDCMPlacing ? { exitOffset: 25, braggAngle: 45, crystal1Length: 0.5, crystal2Length: 0.5 } : {})
               };
               const isGratingActive = placingType === 'GRATING' && ((viewType === 'SIDE' && mockItem.orientation === 'Vertical') || (viewType === 'TOP' && mockItem.orientation === 'Horizontal'));
               const isSimpleMirrorActive = (placingType === 'VFM' && viewType === 'SIDE') || (placingType === 'HFM' && viewType === 'TOP') || isGratingActive;
                const isDcmActiveView = (placingType === 'VDCM' && viewType === 'SIDE') || (placingType === 'HDCM' && viewType === 'TOP');
                const dcmOffset_mm = 25;
                const dcmD_px = dcmOffset_mm * PX_PER_MM_V;
                const dcmAnchorX = isDCMPlacing ? 0.5 * PX_PER_M : 0;
                const dcmAnchorY = isDCMPlacing ? (isDcmActiveView ? 20 + dcmD_px / 2 : 20) : 0;

               let transformOrigin = isSimpleMirrorActive ? '50% 0%' : (isDCMPlacing ? `${dcmAnchorX}px ${dcmAnchorY}px` : '50% 50%');
               let transformOffset = isSimpleMirrorActive ? 'translate(-50%, 0%)' : (isDCMPlacing ? `translate(-${dcmAnchorX}px, -${dcmAnchorY}px)` : 'translate(-50%, -50%)');
               if (placingType === 'SOURCE') {
                   transformOrigin = '100% 50%';
                   transformOffset = 'translate(-100%, -50%)';
               }

               const isAnchorPlacing = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(placingType);
               const itemW = isAnchorPlacing ? 8 : mockItem.dimX;
               const itemH = isAnchorPlacing ? 8 : (placingType === 'XBPM' ? itemW : getItemVisualHeight(mockItem, viewType)); 
               
               const ghostDist = parseFloat(((ghostPos.x - ORIGIN_X) / PX_PER_M).toFixed(1));
               const ghostSnappedX = ORIGIN_X + ghostDist * PX_PER_M;

                let ghostY = activeGhostSnappedY !== undefined && activeGhostSnappedY !== null ? activeGhostSnappedY : ghostPos.y;
                if (['WALL', 'HUTCH', 'CHAMBER'].includes(placingType)) {
                   if (placingType === 'CHAMBER') {
                     ghostY = 150; // Always snap to beam path
                   } else if (viewType === 'SIDE') {
                     ghostY = 200 - itemH / 2; // Floor snap
                   }
                }

                let rotation = 0;
                if (activeGhostBranch === 'diffracted' && !['WALL', 'HUTCH', 'CHAMBER', 'VSPLIT', 'HSPLIT', 'ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(placingType)) {
                    rotation = activeGhostBranchSlope;
                    if (placingType === 'GRATING' && isGratingActive) {
                        rotation -= 45 * Math.PI / 180;
                    }
                } else if (placingType === 'GRATING' && isGratingActive) {
                    rotation = -45 * Math.PI / 180;
                }

                return (
                  <div
                    className={`absolute z-50 pointer-events-none drop-shadow-md transition-all duration-75 ${
                      activeGhostBranch === 'diffracted'
                        ? 'ring-2 ring-amber-500 rounded-sm shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                        : (activeGhostBranch === 'straight'
                            ? 'ring-2 ring-blue-500 rounded-sm shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                            : 'opacity-50')
                    }`}
                    style={{
                      left: ghostSnappedX,
                      top: ghostY,
                      width: itemW,
                      height: itemH,
                      transformOrigin,
                      transform: `${transformOffset} rotate(${rotation}rad)`
                    }}
                  >
                     {/* Snapped branch badge tooltip */}
                     {activeGhostBranch && (
                       <div
                         className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-bold shadow whitespace-nowrap z-50 flex items-center gap-1 ${
                           activeGhostBranch === 'diffracted'
                             ? 'bg-amber-500 text-white shadow-amber-500/50'
                             : 'bg-blue-600 text-white shadow-blue-600/50'
                         }`}
                       >
                         {activeGhostBranch === 'diffracted' ? '⬡ Diffracted' : '→ Straight'}
                       </div>
                     )}
                     <OpticalComponent item={mockItem} itemW={itemW} dcmAnchorX={dcmAnchorX} dcmAnchorY={dcmAnchorY} viewType={viewType} tracePoints={[]} theme={theme} isDarkMode={isDarkMode} />
                  </div>
                );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
