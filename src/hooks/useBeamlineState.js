import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { TYPES, ORIGIN_X, PX_PER_M, GRID_SIZE, SNAP_STEP_M, SNAP_STEP_PX, templates } from '../constants';
import { mapTemplateToItems } from '../utils';
import { calculateUpdatedBounds, getItemBoundsM } from '../utils/constructionUtils';

export const useBeamlineState = (computedItems) => {
  const [items, setItems] = useState(() => mapTemplateToItems(templates["Single Branch"]));
  const [selectedId, setSelectedId] = useState(null);
  const [draggingInfo, setDraggingInfo] = useState(null); 
  const [editingLabel, setEditingLabel] = useState(null); 
  
  const [placingType, setPlacingType] = useState(null);
  const [ghostPos, setGhostPos] = useState(null);

  const [widgetPos, setWidgetPos] = useState({ x: 1000, y: 80 });
  const [isDraggingWidget, setIsDraggingWidget] = useState(false);
  const widgetDragRef = useRef({ offsetX: 0, offsetY: 0 });

  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showRuler, setShowRuler] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [canvasLength, setCanvasLength] = useState(50);
  const [showUI, setShowUI] = useState(true);
  const [activeView, setActiveView] = useState('BOTH'); 
  const [lastClickedView, setLastClickedView] = useState('SIDE');

  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [tableViewMode, setTableViewMode] = useState('split');
  const [isCadExportOpen, setIsCadExportOpen] = useState(false);
  const [canvasSettings, setCanvasSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('beamline_canvas_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          showLabels: parsed.showLabels !== undefined ? parsed.showLabels : true,
          textSize: parsed.textSize ?? 10,
          annotationTextSize: parsed.annotationTextSize ?? 9,
          rulerTextSize: parsed.rulerTextSize ?? 10,
          labelBold: parsed.labelBold ?? false,
        };
      }
    } catch (e) {}
    return {
      showLabels: true,
      textSize: 10,
      annotationTextSize: 9,
      rulerTextSize: 10,
      labelBold: false,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('beamline_canvas_settings', JSON.stringify(canvasSettings));
    } catch (e) {}
  }, [canvasSettings]);

  // Ensure XBPM items normalize to the new 0.425m (8.5px) default square size
  useEffect(() => {
    setItems(prev => {
      let changed = false;
      const updated = prev.map(item => {
        if (item.type === 'XBPM' && (item.length === 0.85 || item.dimX === 17 || !item.dimX || item.dimX !== 8.5)) {
          changed = true;
          return { ...item, length: 0.425, dimX: 8.5, dimY: 8.5, dimZ: 8.5 };
        }
        return item;
      });
      return changed ? updated : prev;
    });
  }, []);
  
  const [pan, setPan] = useState({
    TOP: { x: 50, y: 100 },
    SIDE: { x: 50, y: 100 }
  });
  
  const sideViewRef = useRef(null);
  const topViewRef = useRef(null);
  const sideScrollRef = useRef(null);
  const topScrollRef = useRef(null);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const handleFitToScreen = (customItems = null) => {
    const targetItems = customItems || itemsRef.current || items;
    const viewRef = (activeView === 'SIDE' ? sideScrollRef.current : topScrollRef.current) 
      || sideScrollRef.current 
      || topScrollRef.current;
    if (!viewRef) return false;
    const containerW = viewRef.clientWidth;
    const containerH = viewRef.clientHeight;
    if (containerW <= 0 || containerH <= 0) return false;

    let minX = Infinity, maxX = -Infinity;
    targetItems.forEach(i => {
      const bounds = getItemBoundsM(i);
      const conf = TYPES[i.type] || { width: 20 };
      const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(i.type);
      const isSource = i.type === 'SOURCE';
      const isDCM = i.type === 'VDCM' || i.type === 'HDCM';

      // Physical footprint boundaries (in canvas px)
      const physStartPx = ORIGIN_X + bounds.start * PX_PER_M;
      const physEndPx = ORIGIN_X + bounds.end * PX_PER_M;

      // Visual graphic boundaries (in canvas px)
      const itemW = (isRange || isDCM || isSource) ? (i.dimX ?? conf.width) : conf.width;
      let visStartPx, visEndPx;
      if (isSource) {
        visStartPx = (i.x ?? ORIGIN_X) - itemW;
        visEndPx = (i.x ?? ORIGIN_X);
      } else if (isRange) {
        visStartPx = Math.min(physStartPx, physEndPx);
        visEndPx = Math.max(physStartPx, physEndPx);
      } else {
        const cx = i.x ?? (ORIGIN_X + bounds.dist * PX_PER_M);
        visStartPx = cx - itemW / 2;
        visEndPx = cx + itemW / 2;
      }

      const itemMinX = Math.min(physStartPx, physEndPx, visStartPx, visEndPx);
      const itemMaxX = Math.max(physStartPx, physEndPx, visStartPx, visEndPx);

      if (itemMinX < minX) minX = itemMinX;
      if (itemMaxX > maxX) maxX = itemMaxX;
    });

    if (minX === Infinity || minX >= maxX) {
      minX = ORIGIN_X;
      maxX = ORIGIN_X + 600;
    }
    // Ensure beamline reference origin (0.000m) is included in the frame
    minX = Math.min(minX, ORIGIN_X);

    const paddingX = 80;
    const contentW = (maxX - minX) + paddingX * 2;
    const zoomX = containerW / contentW;

    // Framing vertically around the optical axis (Y = 150)
    const contentH = 240;
    const zoomY = Math.max(0.1, (containerH - 40) / contentH);

    let newZoom = Math.min(zoomX, zoomY);
    newZoom = Math.max(0.1, Math.min(newZoom, 2.5));
    newZoom = parseFloat(newZoom.toFixed(3));

    setZoom(newZoom);

    const targetPanX = Math.round(containerW / 2 - ((minX + maxX) / 2) * newZoom);
    const targetPanY = Math.round(containerH / 2 - 150 * newZoom);

    setPan({
      TOP: { x: targetPanX, y: targetPanY },
      SIDE: { x: targetPanX, y: targetPanY }
    });

    return true;
  };

  // Auto Fit-to-Screen on initial load / refresh
  const hasAutoFittedRef = useRef(false);

  // Synchronous attempt right before browser paint
  useLayoutEffect(() => {
    if (!hasAutoFittedRef.current) {
      const success = handleFitToScreen();
      if (success) {
        hasAutoFittedRef.current = true;
      }
    }
  }, []);

  // Asynchronous fallback attempts for when layout stabilizes shortly after mount
  useEffect(() => {
    if (hasAutoFittedRef.current) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;

    const tryAutoFit = () => {
      if (cancelled || hasAutoFittedRef.current) return;
      const success = handleFitToScreen();
      if (success) {
        hasAutoFittedRef.current = true;
      } else if (attempts < maxAttempts) {
        attempts++;
        requestAnimationFrame(tryAutoFit);
      }
    };

    const rafId = requestAnimationFrame(tryAutoFit);
    const timerId = setTimeout(tryAutoFit, 100);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, []);

  const selectedItem = items.find(i => i.id === selectedId);
  const sourceItem = items.find(i => i.type === 'SOURCE') || {};

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setPlacingType(null);
        setGhostPos(null);
        setEditingLabel(null);
        return;
      }

      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      if (editingLabel) {
        return;
      }

      if (!selectedId) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
        return;
      }

      const step = e.shiftKey ? 1.0 : SNAP_STEP_M;  // Shift = 1 m, normal = 0.1 m

      const targetView = activeView === 'BOTH'
        ? (lastClickedView || 'SIDE')
        : activeView;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const direction = e.key === 'ArrowLeft' ? -1 : 1;

        setItems(prevItems => prevItems.map(item => {
          if (item.id !== selectedId) return item;

          const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
          const currentDist = item.distance ??
            (isRange ? ((item.start ?? 0) + (item.end ?? 0)) / 2 : 0);
          const newDist = parseFloat((currentDist + direction * step).toFixed(2));
          const newX = ORIGIN_X + newDist * PX_PER_M;

          const updated = { ...item, distance: newDist, x: newX };

          if (isRange) {
            updated.start = parseFloat(((item.start ?? 0) + direction * step).toFixed(2));
            updated.end   = parseFloat(((item.end   ?? 0) + direction * step).toFixed(2));
          }
          return updated;
        }).sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? 1 : -1;  // Up = increase height / decrease offset

        setItems(prevItems => prevItems.map(item => {
          if (item.id !== selectedId) return item;

          // These types cannot be moved vertically
          if (['WALL', 'HUTCH'].includes(item.type)) return item;
          // Detectors locked to path also skip vertical movement
          if (item.type === 'DETECTOR' && item.stayInPath !== false) return item;

          if (targetView === 'SIDE') {
            // SIDE view: adjust height above beam
            const currentH = item.height ?? 0;
            const newH = parseFloat((currentH + direction * step).toFixed(2));
            const newY = 150 - newH * PX_PER_M;
            return { ...item, height: newH, y: newY };
          } else {
            // TOP view: adjust lateral offset (Up = move toward viewer = negative offset)
            const currentO = item.offset ?? 0;
            const newO = parseFloat((currentO - direction * step).toFixed(2));
            const newZ = 150 + newO * PX_PER_M;
            return { ...item, offset: newO, z: newZ };
          }
        }));
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedId, editingLabel, activeView, lastClickedView]);

  useEffect(() => {
    const handleWidgetMove = (e) => {
      if (isDraggingWidget) {
        setWidgetPos({
          x: e.clientX - widgetDragRef.current.offsetX,
          y: e.clientY - widgetDragRef.current.offsetY
        });
      }
    };
    const handleWidgetUp = () => setIsDraggingWidget(false);

    if (isDraggingWidget) {
      window.addEventListener('pointermove', handleWidgetMove);
      window.addEventListener('pointerup', handleWidgetUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleWidgetMove);
      window.removeEventListener('pointerup', handleWidgetUp);
    };
  }, [isDraggingWidget]);

  const canvasWidth = ORIGIN_X + (canvasLength + 10) * PX_PER_M;

  const handleWheel = (e, view, scrollRef) => {
    if (placingType || !scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomSensitivity = 0.0015;
    const zoomFactor = 1 - e.deltaY * zoomSensitivity;
    let newZoom = zoom * zoomFactor;
    newZoom = Math.max(0.1, Math.min(newZoom, 2.5));
    const newPanX = mouseX - (mouseX - pan[view].x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan[view].y) * (newZoom / zoom);
    const otherView = view === 'TOP' ? 'SIDE' : 'TOP';
    setZoom(newZoom);
    setPan(prev => ({
      ...prev,
      [view]: { x: newPanX, y: newPanY },
      [otherView]: { x: newPanX, y: prev[otherView].y }
    }));
  };

  const loadTemplate = (templateName) => {
    const selectedTemplate = templates[templateName];
    if (!selectedTemplate) return;
    const newItems = mapTemplateToItems(selectedTemplate);
    setItems(newItems);
    setSelectedId(null);
    requestAnimationFrame(() => handleFitToScreen(newItems));
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear the entire layout? This cannot be undone.")) {
      setItems([]);
      setSelectedId(null);
      setPlacingType(null);
    }
  };

  const handleOpenJsonModal = () => {
    const sortedItems = [...items].sort((a, b) => (a.distance || 0) - (b.distance || 0));
    const cleanItems = sortedItems.map((item) => {
      const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
      const isDCM = ['VDCM', 'HDCM'].includes(item.type);
      const isGrating = item.type === 'GRATING';
      const isSource = item.type === 'SOURCE';
      const isDetector = item.type === 'DETECTOR';
      const isSample = item.type === 'SAMPLE';
      const conf = TYPES[item.type];
      let defaultName = conf?.name || item.type;
      if (isSource) defaultName = item.sourceType || 'Undulator';
      if (isDetector) defaultName = item.detectorType || 'Detector';
      const customName = item.customName || defaultName;
      const exportItem = {
        type: item.type,
        customName,
        showLabel: item.showLabel !== false,
        distance: item.distance ?? 0,
        height: item.height ?? 0,
        offset: item.offset ?? 0
      };

      if (!['WALL', 'HUTCH', 'CHAMBER'].includes(item.type)) {
        exportItem.length = item.length ?? (TYPES[item.type].defaultLength || (TYPES[item.type].width / PX_PER_M));
        if (item.showFootprint !== undefined) {
          exportItem.showFootprint = item.showFootprint;
        }
      }
      if (isRange) {
        exportItem.start = item.start ?? 0;
        exportItem.end = item.end ?? 0;
      }
      if (isDCM) {
        exportItem.exitOffset = item.exitOffset ?? 0.5;
        exportItem.braggAngle = item.braggAngle ?? 20;
        exportItem.crystal1Length = item.crystal1Length ?? TYPES[item.type].defaultCrystal1Length;
        exportItem.crystal2Length = item.crystal2Length ?? TYPES[item.type].defaultCrystal2Length;
        if (item.housingLength !== undefined) exportItem.housingLength = item.housingLength;
        if (item.housingHeight !== undefined) exportItem.housingHeight = item.housingHeight;
      }
      if (isGrating) {
        exportItem.orientation = item.orientation || 'Vertical';
        exportItem.diffractAngle = item.diffractAngle ?? 15;
        exportItem.tiltAngle = item.tiltAngle ?? 0;
      }
      if (isSource) {
        exportItem.sourceType = item.sourceType || 'Undulator';
        exportItem.rayColor = item.rayColor || '#ef4444';
        exportItem.rayWidth = item.rayWidth ?? 1.5;
        exportItem.rayStyle = item.rayStyle || 'dashed';
        exportItem.animate = item.animate !== false;
        exportItem.showArrow = item.showArrow !== false;
      }
      if (isDetector) {
        exportItem.detectorType = item.detectorType || 'Silicon Detector';
        exportItem.passLight = item.passLight === true;
      }
      if (isSample) {
        exportItem.passLight = item.passLight !== false;
      }
      if (item.primaryColor) exportItem.primaryColor = item.primaryColor;
      if (item.secondaryColor) exportItem.secondaryColor = item.secondaryColor;
      return exportItem;
    });
    const formattedJson = "[\n  " + cleanItems.map(item => JSON.stringify(item)).join(",\n  ") + "\n]";
    setJsonText(formattedJson);
    setIsJsonModalOpen(true);
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array of components.");
      const newItems = parsed.map((item, idx) => {
        const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
        const h = item.height ?? 0;
        const o = item.offset ?? 0;
        
        // For range components: y is center. 
        // WALL/HUTCH: anchored to floor (y=200 - h_px/2). 
        // CHAMBER: floating relative to beam (y=150 - h_px).
        const y = isRange ? (item.type === 'CHAMBER' ? 150 - (h * PX_PER_M) : 200 - (h * PX_PER_M) / 2) : 150 - (h * PX_PER_M);
        const z = isRange ? (item.type === 'CHAMBER' ? 150 + (o * PX_PER_M) : 150) : 150 + (o * PX_PER_M);
        
        const dimY = isRange ? (h * PX_PER_M || TYPES[item.type]?.height || 20) : undefined;
        const dimZ = isRange ? (h * PX_PER_M || TYPES[item.type]?.height || 20) : undefined;
        let x = ORIGIN_X + (item.distance || 0) * PX_PER_M;

        let dimX = item.dimX;
        if (dimX === undefined) {
           if (item.length !== undefined) {
              dimX = item.length * PX_PER_M;
           } else if (item.start !== undefined && item.end !== undefined) {
              dimX = Math.abs(item.end - item.start) * PX_PER_M;
           } else {
              dimX = TYPES[item.type]?.width ?? 20;
           }
        }

        let start = item.start;
        let end = item.end;
        if (isRange && start !== undefined && end !== undefined) {
          const startX = ORIGIN_X + start * PX_PER_M;
          const endX = ORIGIN_X + end * PX_PER_M;
          x = (startX + endX) / 2;
          dimX = Math.abs(endX - startX);
        } else if (isRange) {
          const d = item.distance ?? 0;
          const wMeters = dimX / PX_PER_M;
          start = d - wMeters / 2;
          end = d + wMeters / 2;
          const startX = ORIGIN_X + start * PX_PER_M;
          const endX = ORIGIN_X + end * PX_PER_M;
          x = (startX + endX) / 2;
        } else if (['VDCM', 'HDCM'].includes(item.type)) {
          const D_m = item.exitOffset ?? 0.5;
          const theta_deg = item.braggAngle ?? 20;
          const tan2theta = Math.tan(2 * theta_deg * Math.PI / 180);
          const L = Math.abs(tan2theta) > 0.001 ? Math.abs((D_m * PX_PER_M) / tan2theta) : 40;
          dimX = L + 80;
        }
        return {
          ...item,
          id: Date.now() + idx,
          x, y, z, dimX, dimY, dimZ, start, end,
          height: h, offset: o,
          distance: isRange ? (start + end) / 2 : (item.distance ?? 0)
        };
      });
      const sorted = newItems.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setItems(sorted);
      setIsJsonModalOpen(false);
      requestAnimationFrame(() => handleFitToScreen(sorted));
    } catch (err) {
      alert("Invalid JSON format: " + err.message);
    }
  };

  const handleBgPointerDown = (e, view) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return; 
    if (placingType) {
      const wrapperRef = (view === 'TOP' ? topViewRef : sideViewRef);
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      let rawX = (e.clientX - rect.left) / zoom;
      let rawSecondary = (e.clientY - rect.top) / zoom;
      if (snapToGrid) {
        const rawDist = (rawX - ORIGIN_X) / PX_PER_M;
        const snappedDist = Math.round(rawDist / SNAP_STEP_M) * SNAP_STEP_M;
        rawX = ORIGIN_X + snappedDist * PX_PER_M;

        const rayCoord = 150;
        if (view === 'SIDE') {
          const rawHeight = (rayCoord - rawSecondary) / PX_PER_M;
          const snappedHeight = Math.round(rawHeight / SNAP_STEP_M) * SNAP_STEP_M;
          rawSecondary = rayCoord - snappedHeight * PX_PER_M;
        } else {
          const rawOffset = (rawSecondary - rayCoord) / PX_PER_M;
          const snappedOffset = Math.round(rawOffset / SNAP_STEP_M) * SNAP_STEP_M;
          rawSecondary = rayCoord + snappedOffset * PX_PER_M;
        }
      }
      const newDistance = parseFloat(((rawX - ORIGIN_X) / PX_PER_M).toFixed(2));
      const finalX = ORIGIN_X + newDistance * PX_PER_M; 
      const conf = TYPES[placingType];
      if (!conf) {
        setPlacingType(null);
        return;
      }
      const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(placingType);
      const h = conf.height / PX_PER_M;
      const isDCM = placingType === 'VDCM' || placingType === 'HDCM';
      const isChamber = placingType === 'CHAMBER';
      const dOffset = isDCM ? 0.5 : 0;
      const bAngle = isDCM ? 20 : 0;
      let finalDimX = conf.width;

      if (isDCM) {
        const tan2theta = Math.tan(2 * bAngle * Math.PI / 180);
        const L = Math.abs(tan2theta) > 0.001 ? Math.abs((dOffset * PX_PER_M) / tan2theta) : 40;
        finalDimX = L + 80;
      } else if (placingType === 'SOURCE') {
        finalDimX = 2.0 * PX_PER_M;
      }

      const newItem = { 
        id: Date.now(), 
        type: placingType, 
        x: finalX, 
        y: (view === 'SIDE' && !isChamber) ? rawSecondary : 150, 
        z: (view === 'TOP' && !isChamber) ? rawSecondary : 150,
        distance: newDistance,
        height: (view === 'SIDE' && !isChamber) ? parseFloat(((150 - rawSecondary) / PX_PER_M).toFixed(2)) : 0,
        offset: (view === 'TOP' && !isChamber) ? parseFloat(((rawSecondary - 150) / PX_PER_M).toFixed(2)) : 0,
        customName: conf.name,
        dimX: finalDimX,
        showLabel: true,
        ...(placingType === 'SOURCE' ? { 
          sourceType: 'Undulator',
          periodLength: 50,
          numPeriods: 40,
          length: 2.0
        } : {}),
        ...(placingType === 'XBPM' ? { 
          length: 0.425,
          dimX: 8.5,
          dimY: 8.5,
          dimZ: 8.5
        } : {}),
        ...(isDCM ? { exitOffset: dOffset, braggAngle: bAngle } : {}),
        ...(isRange ? { 
           start: parseFloat((newDistance - (conf.width / 2 / PX_PER_M)).toFixed(2)), 
           end: parseFloat((newDistance + (conf.width / 2 / PX_PER_M)).toFixed(2)),
           height: h,
           dimY: conf.height, dimZ: conf.height,
           y: (isChamber ? 150 : 200 - conf.height / 2)
        } : {}),
        ...(placingType === 'GRATING' ? { orientation: 'Vertical', tiltAngle: 0, diffractAngle: 15 } : {}),
        ...(placingType === 'SAMPLE' ? { passLight: true } : {}),
        ...(placingType === 'DETECTOR' ? { passLight: false, detectorType: 'Silicon Detector' } : {})
      };

      setItems(prev => [...prev, newItem].sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      setSelectedId(newItem.id);
      setLastClickedView(view);
      setPlacingType(null);
      setGhostPos(null);
      return; 
    }
    setSelectedId(null);
    setEditingLabel(null);
    const otherView = view === 'TOP' ? 'SIDE' : 'TOP';
    setDraggingInfo({
      type: 'pan',
      view,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan[view].x,
      startPanY: pan[view].y,
      startPanXOther: pan[otherView].x
    });
  };

  const handlePointerDown = (e, id, view, wrapperRef) => {
    if (placingType) {
      handleBgPointerDown(e, view);
      return;
    }
    e.stopPropagation();
    e.preventDefault(); 
    const item = items.find(i => i.id === id);
    if (!item || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const pointerX = (e.clientX - rect.left) / zoom;
    const pointerSecondary = (e.clientY - rect.top) / zoom; 
    setSelectedId(id);
    setLastClickedView(view);
    setDraggingInfo({ 
      type: 'component',
      id, 
      view,
      offsetX: item.x - pointerX,
      offsetSecondary: (view === 'SIDE' ? item.y : item.z) - pointerSecondary
    });
  };

  const handleResizePointerDown = (e, id, view) => {
    if (placingType) {
      handleBgPointerDown(e, view);
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const item = items.find(i => i.id === id);
    if (!item) return;
    const conf = TYPES[item.type];
    const startW = item.dimX ?? conf.width;
    const startH = view === 'SIDE' ? (item.dimY ?? conf.height) : (item.dimZ ?? conf.height);
    setSelectedId(id);
    setLastClickedView(view);
    setDraggingInfo({
      type: 'resize',
      id,
      view,
      startX: e.clientX,
      startY: e.clientY,
      startW,
      startH,
      startXPos: item.x,
      startSecondaryPos: view === 'SIDE' ? item.y : item.z
    });
  };

  const handleLabelPointerDown = (e, id, view) => {
    if (placingType) {
      handleBgPointerDown(e, view);
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const item = items.find(i => i.id === id);
    if (!item) return;
    setSelectedId(id);
    setLastClickedView(view);
    const conf = TYPES[item.type];
    const isGratingActive = item.type === 'GRATING' && ((view === 'SIDE' && (item.orientation || 'Vertical') === 'Vertical') || (view === 'TOP' && item.orientation === 'Horizontal'));
    const isSimpleMirror = (item.type === 'VFM' && view === 'SIDE') || (item.type === 'HFM' && view === 'TOP') || isGratingActive;
    const itemH = view === 'SIDE' ? (item.dimY ?? conf.height) : (item.dimZ ?? conf.height);
    let defaultY = isSimpleMirror ? itemH + 8 : (itemH / 2) + 8;
    if (item.type === 'HUTCH') defaultY = -(itemH / 2) - 12;
    if (item.type === 'WALL') defaultY = (itemH / 2) + 12;
    if (item.type === 'SOURCE') defaultY = 24 + 8;
    const startOffsetX = item.labelOffsets?.[view]?.x !== undefined ? item.labelOffsets[view].x : (item.type === 'SOURCE' ? -((item.dimX ?? conf.width) / 2) : 0);
    const startOffsetY = item.labelOffsets?.[view]?.y !== undefined ? item.labelOffsets[view].y : defaultY;
    setDraggingInfo({
      type: 'label',
      id,
      view,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX,
      startOffsetY
    });
  };

  const handlePointerMove = (e, view, wrapperRef) => {
    if (placingType) {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      let rawX = (e.clientX - rect.left) / zoom;
      let rawSecondary = (e.clientY - rect.top) / zoom; 
      if (snapToGrid) {
        const rawDist = (rawX - ORIGIN_X) / PX_PER_M;
        const snappedDist = Math.round(rawDist / SNAP_STEP_M) * SNAP_STEP_M;
        rawX = ORIGIN_X + snappedDist * PX_PER_M;

        const rayCoord = 150;
        // SIDE view — snap height above beam
        if (view === 'SIDE') {
          const rawHeight = (rayCoord - rawSecondary) / PX_PER_M;
          const snappedHeight = Math.round(rawHeight / SNAP_STEP_M) * SNAP_STEP_M;
          rawSecondary = rayCoord - snappedHeight * PX_PER_M;
        }
        // TOP view — snap lateral offset from beam
        else {
          const rawOffset = (rawSecondary - rayCoord) / PX_PER_M;
          const snappedOffset = Math.round(rawOffset / SNAP_STEP_M) * SNAP_STEP_M;
          rawSecondary = rayCoord + snappedOffset * PX_PER_M;
        }
      }
      setGhostPos({ view, x: rawX, y: rawSecondary });
      return;
    }
    if (!draggingInfo || draggingInfo.view !== view) return;
    if (draggingInfo.type === 'pan') {
      const dx = e.clientX - draggingInfo.startX;
      const dy = e.clientY - draggingInfo.startY;
      const otherView = view === 'TOP' ? 'SIDE' : 'TOP';
      setPan(prev => ({
        ...prev,
        [view]: { x: draggingInfo.startPanX + dx, y: draggingInfo.startPanY + dy },
        [otherView]: { x: draggingInfo.startPanXOther + dx, y: prev[otherView].y }
      }));
      return;
    }
    if (!wrapperRef.current) return;
    if (draggingInfo.type === 'component') {
      const rect = wrapperRef.current.getBoundingClientRect();
      
      let rawX = (e.clientX - rect.left) / zoom + draggingInfo.offsetX;
      let rawSecondary = (e.clientY - rect.top) / zoom + draggingInfo.offsetSecondary; 

      if (snapToGrid) {
        const rawDist = (rawX - ORIGIN_X) / PX_PER_M;
        const snappedDist = Math.round(rawDist / SNAP_STEP_M) * SNAP_STEP_M;
        rawX = ORIGIN_X + snappedDist * PX_PER_M;

        const rayNominal = 150;
        // SIDE view — snap height relative to branch ray
        if (view === 'SIDE') {
          const rawHeight = (rayNominal - rawSecondary) / PX_PER_M;
          const snappedHeight = Math.round(rawHeight / SNAP_STEP_M) * SNAP_STEP_M;
          rawSecondary = rayNominal - snappedHeight * PX_PER_M;
        } else {
          const rawOffset = (rawSecondary - rayNominal) / PX_PER_M;
          const snappedOffset = Math.round(rawOffset / SNAP_STEP_M) * SNAP_STEP_M;
          rawSecondary = rayNominal + snappedOffset * PX_PER_M;
        }
      }

      setItems(prevItems => prevItems.map(item => {
        if (item.id === draggingInfo.id) {
          const isSideActive = ['SOURCE', 'VFM', 'VDCM', 'DETECTOR', 'WALL', 'HUTCH', 'CHAMBER', 'SAMPLE'].includes(item.type);
          const isTopActive = ['SOURCE', 'HFM', 'HDCM', 'DETECTOR', 'WALL', 'HUTCH', 'CHAMBER', 'GRATING', 'SAMPLE'].includes(item.type);
          const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
          
          const newDistance = parseFloat(((rawX - ORIGIN_X) / PX_PER_M).toFixed(2));
          const newHeight = view === 'SIDE' ? parseFloat(((150 - rawSecondary) / PX_PER_M).toFixed(2)) : (item.height ?? 0);
          const newOffset = view === 'TOP' ? parseFloat(((rawSecondary - 150) / PX_PER_M).toFixed(2)) : (item.offset ?? 0);

          let updatedItem = {
            ...item,
            x: rawX,
            distance: newDistance,
            height: newHeight,
            offset: newOffset,
            y: (view === 'SIDE' && isSideActive) ? rawSecondary : item.y,
            z: (view === 'TOP' && isTopActive) ? rawSecondary : item.z
          };

          if (isRange) {
             const halfWMeters = (item.dimX ?? 0) / 2 / PX_PER_M;
             updatedItem.start = parseFloat((newDistance - halfWMeters).toFixed(2));
             updatedItem.end = parseFloat((newDistance + halfWMeters).toFixed(2));
          } else if (item.type === 'SOURCE') {
             const sLen = getItemLengthM(item);
             updatedItem.end = newDistance;
             updatedItem.start = parseFloat((newDistance - sLen).toFixed(3));
          }

          return updatedItem;
        }
        return item;
      }));
    } else if (draggingInfo.type === 'resize') {
      let dx = (e.clientX - draggingInfo.startX) / zoom;
      let dy = (e.clientY - draggingInfo.startY) / zoom;

      if (snapToGrid) {
        const dx_m = Math.round((dx / PX_PER_M) / SNAP_STEP_M) * SNAP_STEP_M;
        const dy_m = Math.round((dy / PX_PER_M) / SNAP_STEP_M) * SNAP_STEP_M;
        dx = dx_m * PX_PER_M;
        dy = dy_m * PX_PER_M;
      }

      setItems(prevItems => prevItems.map(item => {
        if (item.id === draggingInfo.id) {
          const newW = Math.max(GRID_SIZE, draggingInfo.startW + dx);
          const newH = Math.max(GRID_SIZE, view === 'SIDE' ? draggingInfo.startH - dy : draggingInfo.startH + dy);

          const isSideActive = ['WALL', 'HUTCH'].includes(item.type);
          const isTopActive = ['WALL', 'HUTCH'].includes(item.type);
          const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);

          const newX = draggingInfo.startXPos + (newW - draggingInfo.startW) / 2;
          
          let newSecondary = draggingInfo.startSecondaryPos + (newH - draggingInfo.startH) / 2;
          if (view === 'SIDE' && isSideActive) {
            newSecondary = 200 - newH / 2;
          }

          const newDistance = parseFloat(((newX - ORIGIN_X) / PX_PER_M).toFixed(1));

          let updatedItem = {
            ...item,
            dimX: newW,
            ...(view === 'SIDE' ? { dimY: newH } : { dimZ: newH }),
            x: newX,
            distance: newDistance,
            ...(view === 'SIDE' && isSideActive ? { y: newSecondary } : {}),
            ...(view === 'TOP' && isTopActive ? { z: newSecondary } : {})
          };

          if (isRange) {
             const halfWMeters = newW / 2 / PX_PER_M;
             updatedItem.start = parseFloat((newDistance - halfWMeters).toFixed(2));
             updatedItem.end = parseFloat((newDistance + halfWMeters).toFixed(2));
             updatedItem.height = parseFloat((newH / PX_PER_M).toFixed(2));
             updatedItem.dimY = newH;
             updatedItem.dimZ = newH;
          }

          return updatedItem;
        }
        return item;
      }));
    } else if (draggingInfo.type === 'label') {
      const dx = (e.clientX - draggingInfo.startX) / zoom;
      const dy = (e.clientY - draggingInfo.startY) / zoom;
      setItems(items.map(item => {
        if (item.id === draggingInfo.id) {
          return {
            ...item,
            labelOffsets: {
              ...(item.labelOffsets || {}),
              [view]: {
                x: draggingInfo.startOffsetX + dx,
                y: draggingInfo.startOffsetY + dy
              }
            }
          }
        }
        return item;
      }));
    }
  };

  const handlePointerUp = () => {
    if (draggingInfo?.type === 'component') {
      setItems(prev => [...prev].sort((a, b) => (a.distance || 0) - (b.distance || 0)));
    }
    setDraggingInfo(null);
  };

  const handleLabelDoubleClick = (e, id, defaultText) => {
    e.stopPropagation();
    setEditingLabel({ id, text: defaultText });
  };

  const addItem = (typeId) => {
    setPlacingType(typeId);
    setSelectedId(null);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setItems(prev => prev.filter(i => i.id !== selectedId));
      setSelectedId(null);
    }
  };

  const updateItemProp = (propName, val) => {
    if (selectedId) {
      setItems(prevItems => prevItems.map(i => {
        if (i.id === selectedId) {
          const updated = { ...i, [propName]: val };

          if (i.type === 'SOURCE') {
            if (['start', 'end', 'distance'].includes(propName)) {
              const constraint = i.lockLength ? 'LOCK_LENGTH' : (i.lockCenter ? 'LOCK_CENTER' : 'ADJUST_LENGTH');
              return calculateUpdatedBounds(i, propName, val, constraint);
            } else if (propName === 'length' && !isNaN(val) && val !== '') {
              return calculateUpdatedBounds(i, 'length', val);
            } else if (propName === 'numPeriods' && !isNaN(val) && val !== '') {
              const n = Math.max(1, parseInt(val));
              const pLen = updated.periodLength || (updated.sourceType === 'Wiggler' ? 100 : 50);
              updated.numPeriods = n;
              updated.length = parseFloat(((n * pLen) / 1000).toFixed(3));
              updated.dimX = updated.length * PX_PER_M;
              updated.end = i.end !== undefined ? i.end : (i.distance ?? 0);
              updated.start = parseFloat((updated.end - updated.length).toFixed(3));
              updated.distance = updated.end;
              updated.x = ORIGIN_X + updated.end * PX_PER_M;
            } else if (propName === 'periodLength' && !isNaN(val) && val !== '') {
              const pLen = Math.max(1, parseFloat(val));
              const n = updated.numPeriods || (updated.sourceType === 'Wiggler' ? 20 : 40);
              updated.periodLength = pLen;
              updated.length = parseFloat(((n * pLen) / 1000).toFixed(3));
              updated.dimX = updated.length * PX_PER_M;
              updated.end = i.end !== undefined ? i.end : (i.distance ?? 0);
              updated.start = parseFloat((updated.end - updated.length).toFixed(3));
              updated.distance = updated.end;
              updated.x = ORIGIN_X + updated.end * PX_PER_M;
            } else if (propName === 'sourceType') {
              if (val === 'Bending Magnet') {
                updated.dimX = 30;
                updated.length = 1.5;
              } else {
                const pLen = val === 'Wiggler' ? 100 : 50;
                const n = val === 'Wiggler' ? 20 : 40;
                updated.periodLength = pLen;
                updated.numPeriods = n;
                updated.length = parseFloat(((pLen * n) / 1000).toFixed(3));
                updated.dimX = updated.length * PX_PER_M;
              }
              updated.end = i.end !== undefined ? i.end : (i.distance ?? 0);
              updated.start = parseFloat((updated.end - updated.length).toFixed(3));
              updated.distance = updated.end;
              updated.x = ORIGIN_X + updated.end * PX_PER_M;
            }
          } else if (['start', 'end'].includes(propName)) {
            const constraint = i.lockLength ? 'LOCK_LENGTH' : (i.lockCenter ? 'LOCK_CENTER' : 'ADJUST_LENGTH');
            return calculateUpdatedBounds(i, propName, val, constraint);
          } else if (propName === 'lockLength') {
            updated.lockLength = Boolean(val);
            if (val) updated.lockCenter = false;
          } else if (propName === 'lockCenter') {
            updated.lockCenter = Boolean(val);
            if (val) updated.lockLength = false;
          } else if (propName === 'length' && !isNaN(val) && val !== '') {
            return calculateUpdatedBounds(i, 'length', val);
          } else if (['WALL', 'HUTCH', 'CHAMBER'].includes(i.type)) {
            const s = propName === 'start' ? Number(val) : (i.start ?? 0);
            const e = propName === 'end' ? Number(val) : (i.end ?? 0);
            const startX = ORIGIN_X + s * PX_PER_M;
            const endX = ORIGIN_X + e * PX_PER_M;
            updated.x = (startX + endX) / 2;
            updated.dimX = Math.abs(endX - startX);
            updated.distance = (s + e) / 2;
          } else if (['VDCM', 'HDCM'].includes(i.type)) {
            if (propName === 'housingLength') {
              if (val === undefined || val === '') {
                delete updated.housingLength;
                const d = i.exitOffset ?? 0.5;
                const a = i.braggAngle ?? 20;
                const tan2theta = Math.tan(2 * a * Math.PI / 180);
                const L = Math.abs(tan2theta) > 0.001 ? Math.abs((d * PX_PER_M) / tan2theta) : 40;
                updated.dimX = L + 80;
              } else {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                  updated.housingLength = num;
                  updated.dimX = num * PX_PER_M;
                }
              }
            } else if (propName === 'housingHeight') {
              if (val === undefined || val === '') {
                delete updated.housingHeight;
                delete updated.dimY;
                delete updated.dimZ;
              } else {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                  updated.housingHeight = num;
                  updated.dimY = num * PX_PER_M;
                  updated.dimZ = num * PX_PER_M;
                }
              }
            } else {
              const d = propName === 'exitOffset' ? Number(val) : (i.exitOffset ?? 0.5);
              const a = propName === 'braggAngle' ? Number(val) : (i.braggAngle ?? 20);
              const tan2theta = Math.tan(2 * a * Math.PI / 180);
              const L = Math.abs(tan2theta) > 0.001 ? Math.abs((d * PX_PER_M) / tan2theta) : 40;
              if (updated.housingLength !== undefined && !isNaN(updated.housingLength) && Number(updated.housingLength) > 0) {
                updated.dimX = Number(updated.housingLength) * PX_PER_M;
              } else {
                updated.dimX = L + 80; 
              }
            }
            if (propName === 'distance' && !isNaN(val) && val !== '') {
               updated.x = ORIGIN_X + Number(val) * PX_PER_M;
            }
          } else if (propName === 'distance' && !isNaN(val) && val !== '') {
            return calculateUpdatedBounds(i, 'distance', val);
          }
          if (propName === 'height' && !isNaN(val) && val !== '') {
            updated.y = 150 - (Number(val) * PX_PER_M);
          } else if (propName === 'offset' && !isNaN(val) && val !== '') {
            updated.z = 150 + (Number(val) * PX_PER_M);
          }
          return updated;
        }
        return i;
      }));
    }
  };

  return {
    items, setItems, selectedId, setSelectedId, draggingInfo, setDraggingInfo,
    editingLabel, setEditingLabel, placingType, setPlacingType, ghostPos, setGhostPos,
    widgetPos, setWidgetPos, isDraggingWidget, setIsDraggingWidget, widgetDragRef,
    zoom, setZoom, showGrid, setShowGrid, snapToGrid, setSnapToGrid, showRuler, setShowRuler,
    showAnnotations, setShowAnnotations,
    canvasLength, setCanvasLength, showUI, setShowUI, activeView, setActiveView,
    lastClickedView, setLastClickedView, isJsonModalOpen, setIsJsonModalOpen,
    isSettingsModalOpen, setIsSettingsModalOpen, canvasSettings, setCanvasSettings,
    isTableOpen, setIsTableOpen, tableViewMode, setTableViewMode, isCadExportOpen, setIsCadExportOpen,
    jsonText, setJsonText, pan, setPan, sideViewRef, topViewRef, sideScrollRef, topScrollRef,
    selectedItem, sourceItem, canvasWidth, handleWheel, loadTemplate, handleClearAll,
    handleOpenJsonModal, handleApplyJson, handleFitToScreen, handleBgPointerDown,
    handlePointerDown, handleResizePointerDown, handleLabelPointerDown, handlePointerMove,
    handlePointerUp, handleLabelDoubleClick, addItem, deleteSelected, updateItemProp
  };
};
