import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { TYPES, ORIGIN_X, PX_PER_M, GRID_SIZE, SNAP_STEP_M, SNAP_STEP_PX, templates } from '../constants';
import { mapTemplateToItems, getItemVisualHeight } from '../utils';
import { calculateUpdatedBounds, getItemBoundsM, parseCsvToItems } from '../utils/constructionUtils';

export const useBeamlineState = (computedItems) => {
  const [items, setItems] = useState(() => {
    try {
      const templateKeys = Object.keys(templates);
      if (templateKeys.length > 0) {
        // Pick 'Single Branch' if it exists, otherwise the first template in the folder
        const initialKey = templates["Single Branch"] ? "Single Branch" : templateKeys[0];
        const defaultTemplate = templates[initialKey];
        if (defaultTemplate?.rawCsv) {
          const parsed = parseCsvToItems(defaultTemplate.rawCsv);
          if (parsed && parsed.length > 0) return parsed;
        }
        if (Array.isArray(defaultTemplate)) {
          return mapTemplateToItems(defaultTemplate);
        }
      }
    } catch (e) {
      console.warn("Failed to load initial template:", e);
    }
    return [];
  });
  const [selectedId, setSelectedId] = useState(null);
  const [draggingInfo, setDraggingInfo] = useState(null); 
  const draggingInfoRef = useRef(null);
  const updateDraggingInfo = (val) => {
    draggingInfoRef.current = val;
    setDraggingInfo(val);
  };

  const computedItemsRef = useRef(computedItems || []);
  const setComputedItems = (newItems) => {
    computedItemsRef.current = newItems;
  };
  useEffect(() => {
    if (computedItems && computedItems.length > 0) {
      computedItemsRef.current = computedItems;
    }
  }, [computedItems]);

  const [editingLabel, setEditingLabel] = useState(null); 
  const editingLabelRef = useRef(null);
  useEffect(() => {
    editingLabelRef.current = editingLabel;
  }, [editingLabel]); 
  
  const [placingType, setPlacingType] = useState(null);
  const [ghostPos, setGhostPos] = useState(null);

  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [canvasLength, setCanvasLength] = useState(() => {
    try {
      const templateKeys = Object.keys(templates);
      if (templateKeys.length > 0) {
        const initialKey = templates["Single Branch"] ? "Single Branch" : templateKeys[0];
        const defaultTemplate = templates[initialKey];
        if (defaultTemplate?.rawCsv) {
          const lengthMatch = defaultTemplate.rawCsv.match(/Total Beamline Length:\s*([\d.]+)\s*m/i);
          if (lengthMatch && !isNaN(parseFloat(lengthMatch[1])) && parseFloat(lengthMatch[1]) > 0) {
            return parseFloat(lengthMatch[1]);
          }
        }
      }
    } catch (e) {}
    return 60;
  });
  const [showUI, setShowUI] = useState(true);
  const [activeView, setActiveView] = useState('BOTH'); 
  const [lastClickedView, setLastClickedView] = useState('SIDE');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [tableViewMode, setTableViewMode] = useState('split');
  const [isCadExportOpen, setIsCadExportOpen] = useState(false);
  const [loadedFileName, setLoadedFileName] = useState('');
  const [templateList, setTemplateList] = useState(() => {
    return Object.keys(templates).map(k => ({
      name: k,
      fileName: templates[k]?.fileName || `${k}.csv`
    }));
  });

  const refreshTemplates = async () => {
    try {
      let res = await fetch('./api/templates?t=' + Date.now());
      if (!res.ok) {
        res = await fetch('./templates/manifest.json?t=' + Date.now());
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTemplateList(data);
          return data;
        }
      }
    } catch (e) {
      try {
        const res = await fetch('./templates/manifest.json?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setTemplateList(data);
            return data;
          }
        }
      } catch (err) {}
    }
    return templateList;
  };

  useEffect(() => {
    refreshTemplates().then(list => {
      if (list && list.length > 0) {
        // Auto-load preferred template or first template from disk
        const target = list.find(t => t.name === 'SPS-II_SWAXS') || list[0];
        loadTemplate(target.fileName || `${target.name}.csv`);
      }
    });

    if (typeof import.meta !== 'undefined' && import.meta.hot && typeof import.meta.hot.on === 'function') {
      import.meta.hot.on('templates-updated', () => {
        refreshTemplates();
      });
    }
  }, []);
  const [canvasSettings, setCanvasSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('beamline_canvas_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          showLabels: parsed.showLabels !== undefined ? parsed.showLabels : true,
          showFootprintBoxes: parsed.showFootprintBoxes !== undefined ? parsed.showFootprintBoxes : true,
          showFootprintText: parsed.showFootprintText !== undefined ? parsed.showFootprintText : true,
          textSize: parsed.textSize ?? 10,
          annotationTextSize: parsed.annotationTextSize ?? 9,
          rulerTextSize: parsed.rulerTextSize ?? 10,
          labelBold: parsed.labelBold ?? false,
        };
      }
    } catch (e) {}
    return {
      showLabels: true,
      showFootprintBoxes: true,
      showFootprintText: true,
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
        if (['VDCM', 'HDCM'].includes(item.type) && (item.dimX === 160 || item.dimX > 50 || item.length > 3 || item.dimY === 60 || item.chamberLength === undefined)) {
          changed = true;
          const chLen = (item.chamberLength && item.chamberLength <= 3) ? item.chamberLength : 1.5;
          return {
            ...item,
            length: chLen,
            physicalLength: chLen,
            chamberLength: chLen,
            dimX: chLen * PX_PER_M,
            dimY: 24,
            dimZ: 24
          };
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
    // If called directly from an event handler like onClick={handleFitToScreen},
    // customItems will be a SyntheticEvent object rather than an array of items.
    const targetItems = Array.isArray(customItems) ? customItems : (itemsRef.current || items);
    
    const topContainer = topScrollRef.current;
    const sideContainer = sideScrollRef.current;
    const activeContainer = (activeView === 'SIDE' ? sideContainer : topContainer) 
      || topContainer 
      || sideContainer;

    if (!activeContainer && !topContainer && !sideContainer) return false;

    // Use the primary container or whichever is available for horizontal measurement
    const primaryContainer = activeContainer || topContainer || sideContainer;
    const containerW = primaryContainer.clientWidth;
    if (containerW <= 0) return false;

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
    const availableH = Math.min(
      (topContainer && topContainer.clientHeight > 0) ? topContainer.clientHeight : Infinity,
      (sideContainer && sideContainer.clientHeight > 0) ? sideContainer.clientHeight : Infinity,
      primaryContainer.clientHeight > 0 ? primaryContainer.clientHeight : Infinity
    );
    if (!Number.isFinite(availableH) || availableH <= 40) return false;
    const zoomY = Math.max(0.1, (availableH - 40) / contentH);

    let newZoom = Math.min(zoomX, zoomY);
    newZoom = Math.max(0.1, Math.min(newZoom, 2.5));
    newZoom = parseFloat(newZoom.toFixed(3));

    setZoom(newZoom);

    const targetPanX = Math.round(containerW / 2 - ((minX + maxX) / 2) * newZoom);
    
    // Compute Y pan per container height so both TOP and SIDE viewports center the beam axis at 150px
    const topH = topContainer?.clientHeight || primaryContainer.clientHeight;
    const sideH = sideContainer?.clientHeight || primaryContainer.clientHeight;
    const topPanY = Math.round(topH / 2 - 150 * newZoom);
    const sidePanY = Math.round(sideH / 2 - 150 * newZoom);

    setPan({
      TOP: { x: targetPanX, y: topPanY },
      SIDE: { x: targetPanX, y: sidePanY }
    });

    return true;
  };

  const focusItemTimerRef = useRef(null);

  const cancelFocusItem = () => {
    if (focusItemTimerRef.current) {
      clearTimeout(focusItemTimerRef.current);
      focusItemTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (focusItemTimerRef.current) {
        clearTimeout(focusItemTimerRef.current);
      }
    };
  }, []);

  const focusItem = (targetItemOrId) => {
    if (editingLabelRef.current) return;
    requestAnimationFrame(() => {
      const topContainer = topScrollRef.current;
      const sideContainer = sideScrollRef.current;
      const activeContainer = (activeView === 'SIDE' ? sideContainer : topContainer)
        || topContainer
        || sideContainer;

      if (!activeContainer && !topContainer && !sideContainer) return;

        const primaryContainer = activeContainer || topContainer || sideContainer;
        const containerW = primaryContainer.clientWidth;
        if (containerW <= 0) return;

        const item = typeof targetItemOrId === 'object' && targetItemOrId !== null
          ? targetItemOrId
          : (computedItemsRef.current?.find(i => i.id === targetItemOrId)
             || itemsRef.current?.find(i => i.id === targetItemOrId)
             || items.find(i => i.id === targetItemOrId));
        if (!item) return;

        const conf = TYPES[item.type] || {};
        const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
        const isSource = item.type === 'SOURCE';
        const isDCM = item.type === 'VDCM' || item.type === 'HDCM';

        const bounds = getItemBoundsM ? getItemBoundsM(item) : null;
        const physLenM = bounds?.physLen ?? (item.physicalLength || conf.defaultLength || (conf.width ? conf.width / PX_PER_M : 1));
        const compW = isDCM
          ? (bounds?.len ? bounds.len * PX_PER_M : 30)
          : ((isRange || isSource)
            ? (item.dimX ?? conf.width ?? 40)
            : Math.max(6, physLenM * PX_PER_M));
        const compH_side = getItemVisualHeight(item, 'SIDE');
        const compH_top = getItemVisualHeight(item, 'TOP');

        // 1. Calculate Component target center X in canvas space
        let targetCenterX = item.x ?? (ORIGIN_X + (item.distance || 0) * PX_PER_M);
        if (isSource) {
          targetCenterX = targetCenterX - compW / 2;
        } else if (isDCM) {
          const parsedD = parseFloat(item.exitOffset);
          const d_m = !isNaN(parsedD) ? parsedD : 0.5;
          const parsedTh = parseFloat(item.braggAngle);
          const th_deg = !isNaN(parsedTh) ? parsedTh : 20;
          const tan2th = Math.tan(2 * th_deg * Math.PI / 180);
          const L = Math.abs(tan2th) > 0.001 ? Math.abs((d_m * PX_PER_M) / tan2th) : 40;
          targetCenterX = targetCenterX + L / 2;
        } else if (isRange && item.start !== undefined && item.end !== undefined) {
          targetCenterX = ORIGIN_X + ((parseFloat(item.start) + parseFloat(item.end)) / 2) * PX_PER_M;
        }

        // 2. Calculate Component target center in TOP view (lateral coordinate Z)
        let targetCenterZ_top;
        if (item.type === 'HFM' || (item.type === 'GRATING' && item.orientation === 'Horizontal')) {
          const surfaceZ = item.z !== undefined ? item.z : 150;
          targetCenterZ_top = surfaceZ + compH_top / 2;
        } else if (item.type === 'HDCM') {
          if (item.z !== undefined) {
            targetCenterZ_top = item.z;
          } else {
            const d_m = parseFloat(item.exitOffset) || 0.5;
            targetCenterZ_top = 150 + (d_m * PX_PER_M) / 2;
          }
        } else {
          targetCenterZ_top = item.z !== undefined
            ? item.z
            : (150 + (parseFloat(item.hOffsetLateral) || 0) * PX_PER_M);
        }

        // 3. Calculate Component target center in SIDE view (elevation coordinate Y)
        let targetCenterY_side;
        if (item.type === 'WALL' || item.type === 'HUTCH') {
          targetCenterY_side = 200 - compH_side / 2;
        } else if (item.type === 'VFM' || (item.type === 'GRATING' && (item.orientation || 'Vertical') === 'Vertical')) {
          const surfaceY = item.y !== undefined ? item.y : 150;
          targetCenterY_side = surfaceY + compH_side / 2;
        } else if (item.type === 'VDCM') {
          if (item.y !== undefined) {
            targetCenterY_side = item.y;
          } else {
            const d_m = parseFloat(item.exitOffset) || 0.5;
            targetCenterY_side = 150 - (d_m * PX_PER_M) / 2;
          }
        } else {
          targetCenterY_side = item.y !== undefined
            ? item.y
            : (200 - (parseFloat(item.vOffsetFloor) ?? 2.5) * PX_PER_M);
        }

        // Available container dimensions
        const topH = (topContainer && topContainer.clientHeight > 0)
          ? topContainer.clientHeight
          : (primaryContainer.clientHeight > 0 ? primaryContainer.clientHeight : 400);
        const sideH = (sideContainer && sideContainer.clientHeight > 0)
          ? sideContainer.clientHeight
          : (primaryContainer.clientHeight > 0 ? primaryContainer.clientHeight : 400);
        const viewH = activeView === 'TOP'
          ? topH
          : (activeView === 'SIDE' ? sideH : Math.min(topH, sideH));

        // 4. Calculate zoom-in level to fit-to-screen of that component:
        // Include component body, footprint, and label to establish its visual envelope.
        const labelText = item.customName || conf.name || '';
        const labelW = Math.max(30, labelText.length * 8.5);
        const compVisualW = Math.max(compW, labelW, 40);
        const compVisualH = Math.max(compH_side, compH_top, 30);

        // Frame the component so it comfortably fills ~70% of the visible viewport
        const targetOccupancy = 0.70;
        const fitZoomX = (containerW * targetOccupancy) / compVisualW;
        const fitZoomY = (viewH * targetOccupancy) / compVisualH;
        const componentFitZoom = Math.min(fitZoomX, fitZoomY);

        // Zoom range: allow up to 3.5x for small optics (slits, detectors, filters, mirrors)
        // so they are prominently enlarged, scaling down naturally for large enclosures (DCMs, chambers, hutches, walls)
        const targetZoom = parseFloat(Math.min(3.5, Math.max(0.4, componentFitZoom)).toFixed(2));

        // 5. Calculate Pan coordinates to center component on screen
        const targetPanX = Math.round(containerW / 2 - targetCenterX * targetZoom);
        const topPanY = Math.round(topH / 2 - targetCenterZ_top * targetZoom);
        const sidePanY = Math.round(sideH / 2 - targetCenterY_side * targetZoom);

        setZoom(targetZoom);
        setPan({
          TOP: { x: targetPanX, y: topPanY },
          SIDE: { x: targetPanX, y: sidePanY }
        });
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

  // Auto Fit-to-Screen when user switches view (TOP, BOTH, SIDE)
  const isViewMountRef = useRef(true);
  useEffect(() => {
    if (isViewMountRef.current) {
      isViewMountRef.current = false;
      return;
    }
    let raf2 = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        handleFitToScreen();
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [activeView]);

  const handleSetActiveView = (newView) => {
    if (activeView === newView) {
      handleFitToScreen();
    } else {
      setActiveView(newView);
    }
  };

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
          if (item.isLocked) return item; // locked optics cannot be moved accidentally

          const bounds = getItemBoundsM(item);
          const currentDist = item.distance ?? bounds.dist;
          // Automatically snap/round to 0.1 m resolution
          const baseDist = Math.round(currentDist * 10) / 10;
          const newDist = parseFloat((baseDist + direction * step).toFixed(1));
          const constraint = item.lockLength ? 'LOCK_LENGTH' : (item.lockCenter ? 'LOCK_CENTER' : 'ADJUST_LENGTH');
          return calculateUpdatedBounds(item, 'distance', newDist, constraint);
        }).sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? 1 : -1;  // Up = increase height / decrease offset

        setItems(prevItems => prevItems.map(item => {
          if (item.id !== selectedId) return item;
          if (item.isLocked) return item; // locked optics cannot be moved accidentally

          // Only Source, Detector, and Anchors have editable elevation / offset; other optics auto-calculate from beam path
          if (!['SOURCE', 'DETECTOR', 'ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(item.type)) return item;

          const comp = computedItemsRef.current?.find(c => c.id === item.id);

          // For ANCHOR_SIDE: always adjust height (elevation)
          // For ANCHOR_TOP: always adjust offset (lateral)
          // For others: follow targetView
          const adjustHeight = item.type === 'ANCHOR_SIDE' || (item.type !== 'ANCHOR_TOP' && targetView === 'SIDE');

          if (adjustHeight) {
            // SIDE view / Elevation: adjust height above beam, snapped to 0.1 m resolution
            const currentH = (item.type === 'DETECTOR' && item.stayInPath !== false && comp?.y !== undefined)
              ? parseFloat(((150 - comp.y) / PX_PER_M).toFixed(2))
              : (item.height !== undefined 
                ? item.height 
                : parseFloat(((150 - (item.y ?? 150)) / PX_PER_M).toFixed(2)));
            const baseH = Math.round(currentH * 10) / 10;
            const newH = parseFloat((baseH + direction * step).toFixed(2));
            const newY = 150 - newH * PX_PER_M;
            return { 
              ...item, 
              height: newH, 
              y: newY,
              ...(item.type === 'DETECTOR' ? { stayInPath: false } : {})
            };
          } else {
            // TOP view / Lateral offset: adjust lateral offset, snapped to 0.1 m resolution
            const currentO = (item.type === 'DETECTOR' && item.stayInPath !== false && comp?.z !== undefined)
              ? parseFloat((((comp.z) - 150) / PX_PER_M).toFixed(2))
              : (item.offset !== undefined 
                ? item.offset 
                : parseFloat((((item.z ?? 150) - 150) / PX_PER_M).toFixed(2)));
            const baseO = Math.round(currentO * 10) / 10;
            const newO = parseFloat((baseO - direction * step).toFixed(2));
            const newZ = 150 + newO * PX_PER_M;
            return { 
              ...item, 
              offset: newO, 
              z: newZ,
              ...(item.type === 'DETECTOR' ? { stayInPath: false } : {})
            };
          }
        }));
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedId, editingLabel, activeView, lastClickedView]);

  const canvasWidth = ORIGIN_X + (canvasLength + 10) * PX_PER_M;

  const handleWheel = (e, view, scrollRef) => {
    cancelFocusItem();
    if (placingType || !scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomSensitivity = 0.0015;
    const zoomFactor = 1 - e.deltaY * zoomSensitivity;
    let newZoom = zoom * zoomFactor;
    newZoom = Math.max(0.1, Math.min(newZoom, 6.0));
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

  const loadTemplate = async (templateNameOrFileName) => {
    // 1. Try to fetch directly from API or static templates folder with cache-busting
    try {
      const found = templateList.find(t => 
        t.name === templateNameOrFileName || 
        t.fileName === templateNameOrFileName ||
        t.fileName === `${templateNameOrFileName}.csv`
      );
      const fileName = found ? found.fileName : (templateNameOrFileName.endsWith('.csv') ? templateNameOrFileName : `${templateNameOrFileName}.csv`);
      const urlsToTry = [
        found?.url,
        `./api/templates/file/${encodeURIComponent(fileName)}`,
        `./templates/${encodeURIComponent(fileName)}`
      ].filter(Boolean);

      for (const url of urlsToTry) {
        try {
          const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`);
          if (res.ok) {
            const csvText = await res.text();
            if (csvText && csvText.trim().length > 0 && !csvText.startsWith('<!DOCTYPE')) {
              handleImportCsv(csvText);
              setLoadedFileName(fileName);
              return true;
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn("Direct template fetch failed, falling back to static:", e);
    }

    // 2. Bundled fallback
    const selectedTemplate = templates[templateNameOrFileName] || Object.values(templates).find(t => t.fileName === templateNameOrFileName);
    if (selectedTemplate?.rawCsv) {
      handleImportCsv(selectedTemplate.rawCsv);
      setLoadedFileName(selectedTemplate.fileName || `${templateNameOrFileName}.csv`);
      return true;
    }
    if (Array.isArray(selectedTemplate)) {
      const newItems = mapTemplateToItems(selectedTemplate);
      setItems(newItems);
      setSelectedId(null);
      setLoadedFileName(templateNameOrFileName);
      requestAnimationFrame(() => handleFitToScreen(newItems));
      return true;
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear the entire layout? This cannot be undone.")) {
      setItems([]);
      setSelectedId(null);
      setPlacingType(null);
      setLoadedFileName('');
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
        finalDimX = 1.5 * PX_PER_M;
      } else if (placingType === 'SOURCE') {
        finalDimX = 2.0 * PX_PER_M;
      }

      if (placingType === 'ANCHOR_SIDE' && view === 'TOP') return;
      if (placingType === 'ANCHOR_TOP' && view === 'SIDE') return;

      const isAnchor = ['ANCHOR', 'ANCHOR_SIDE', 'ANCHOR_TOP'].includes(placingType);
      const isOptic = !isRange && !isChamber && !isAnchor;
      const initialHeight = placingType === 'ANCHOR_SIDE' || (placingType === 'ANCHOR' && view === 'SIDE')
        ? parseFloat(((150 - rawSecondary) / PX_PER_M).toFixed(2))
        : (isOptic ? 0 : ((view === 'SIDE') ? parseFloat(((150 - rawSecondary) / PX_PER_M).toFixed(2)) : 0));
      const initialOffset = placingType === 'ANCHOR_TOP' || (placingType === 'ANCHOR' && view === 'TOP')
        ? parseFloat(((rawSecondary - 150) / PX_PER_M).toFixed(2))
        : (isOptic ? 0 : ((view === 'TOP') ? parseFloat(((rawSecondary - 150) / PX_PER_M).toFixed(2)) : 0));

      const newItem = { 
        id: Date.now(), 
        type: placingType, 
        x: finalX, 
        y: isOptic ? 150 : ((view === 'SIDE') ? rawSecondary : 150), 
        z: isOptic ? 150 : ((view === 'TOP') ? rawSecondary : 150),
        distance: newDistance,
        height: initialHeight,
        offset: initialOffset,
        customName: conf.name,
        dimX: isAnchor ? 8 : finalDimX,
        showLabel: !isAnchor,
        showFootprint: false,
        showFootprintText: false,
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
        ...(isDCM ? { exitOffset: dOffset, braggAngle: bAngle, length: 1.5, physicalLength: 1.5, chamberLength: 1.5, dimY: 24, dimZ: 24 } : {}),
        ...(placingType === 'VFM' ? { substrateThickness: 0.3, faceHeight: 1.0, length: 2.0, physicalLength: 2.0 } : {}),
        ...(placingType === 'HFM' ? { substrateThickness: 0.3, faceHeight: 1.0, length: 2.0, physicalLength: 2.0 } : {}),
        ...(isRange ? { 
           start: parseFloat((newDistance - (conf.width / 2 / PX_PER_M)).toFixed(2)), 
           end: parseFloat((newDistance + (conf.width / 2 / PX_PER_M)).toFixed(2)),
           height: h,
           dimY: conf.height, dimZ: conf.height,
           y: (isChamber ? 150 : 200 - conf.height / 2)
        } : {}),
        ...(placingType === 'GRATING' ? { orientation: 'Vertical', tiltAngle: 0, diffractAngle: 15 } : {}),
        ...(placingType === 'SAMPLE' ? { passLight: true } : {}),
        ...(placingType === 'DETECTOR' ? { passLight: false, stayInPath: true, detectorType: 'Silicon Detector' } : {}),
        ...(isAnchor ? {
          length: 0,
          physicalLength: 0,
          chamberLength: 0,
          start: newDistance,
          end: newDistance,
          passLight: true,
          stayInPath: false,
          showLabel: false,
          showFootprint: false,
          showFootprintText: false
        } : {})
      };

      setItems(prev => [...prev, newItem].sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      setSelectedId(newItem.id);
      setLastClickedView(view);
      setPlacingType(null);
      setGhostPos(null);
      return; 
    }
    cancelFocusItem();
    setSelectedId(null);
    setEditingLabel(null);
    const otherView = view === 'TOP' ? 'SIDE' : 'TOP';
    updateDraggingInfo({
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
    if (editingLabel && editingLabel.id !== id) {
      setEditingLabel(null);
    }
    const item = (computedItemsRef.current?.find(i => i.id === id)) || items.find(i => i.id === id);
    if (!item || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const pointerX = (e.clientX - rect.left) / zoom;
    const pointerSecondary = (e.clientY - rect.top) / zoom; 
    setSelectedId(id);
    setLastClickedView(view);
    if (item.isLocked) {
      cancelFocusItem();
      focusItemTimerRef.current = setTimeout(() => {
        focusItem(id);
        focusItemTimerRef.current = null;
      }, 40);
      return;
    }
    const bounds = getItemBoundsM(item);
    updateDraggingInfo({ 
      type: 'component',
      id, 
      view,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: item.x - pointerX,
      offsetSecondary: (view === 'SIDE' ? item.y : item.z) - pointerSecondary,
      startDist: bounds.dist,
      startChamberStart: bounds.start,
      startChamberEnd: bounds.end
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
    if (!item || item.isLocked) return;
    const conf = TYPES[item.type];
    const startW = item.dimX ?? conf.width;
    const startH = view === 'SIDE' ? (item.dimY ?? conf.height) : (item.dimZ ?? conf.height);
    setSelectedId(id);
    setLastClickedView(view);
    updateDraggingInfo({
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
    const item = items.find(i => i.id === id);
    if (!item) return;
    setSelectedId(id);
    setLastClickedView(view);
    const conf = TYPES[item.type];
    const isGratingActive = item.type === 'GRATING' && ((view === 'SIDE' && (item.orientation || 'Vertical') === 'Vertical') || (view === 'TOP' && item.orientation === 'Horizontal'));
    const isSimpleMirror = (item.type === 'VFM' && view === 'SIDE') || (item.type === 'HFM' && view === 'TOP') || isGratingActive;
    const itemH = getItemVisualHeight(item, view);
    let defaultY = isSimpleMirror ? itemH + 8 : (itemH / 2) + 8;
    if (item.type === 'HUTCH') defaultY = -(itemH / 2) - 12;
    if (item.type === 'WALL') defaultY = (itemH / 2) + 12;
    if (item.type === 'SOURCE') defaultY = 24 + 8;
    const startOffsetX = item.labelOffsets?.[view]?.x !== undefined ? item.labelOffsets[view].x : (item.type === 'SOURCE' ? -((item.dimX ?? conf.width) / 2) : 0);
    const startOffsetY = item.labelOffsets?.[view]?.y !== undefined ? item.labelOffsets[view].y : defaultY;
    updateDraggingInfo({
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
    const currentDrag = draggingInfoRef.current || draggingInfo;
    if (!currentDrag || currentDrag.view !== view) return;
    if (currentDrag.type === 'pan') {
      const dx = e.clientX - currentDrag.startX;
      const dy = e.clientY - currentDrag.startY;
      const otherView = view === 'TOP' ? 'SIDE' : 'TOP';
      setPan(prev => ({
        ...prev,
        [view]: { x: currentDrag.startPanX + dx, y: currentDrag.startPanY + dy },
        [otherView]: { x: currentDrag.startPanXOther + dx, y: prev[otherView].y }
      }));
      return;
    }
    if (!wrapperRef.current) return;
    if (currentDrag.type === 'component') {
      const dist = Math.hypot(e.clientX - (currentDrag.startX ?? e.clientX), e.clientY - (currentDrag.startY ?? e.clientY));
      if (dist > 4) {
        currentDrag.hasMoved = true;
      }
      const rect = wrapperRef.current.getBoundingClientRect();
      
      let rawX = (e.clientX - rect.left) / zoom + currentDrag.offsetX;
      let rawSecondary = (e.clientY - rect.top) / zoom + currentDrag.offsetSecondary; 

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
        if (item.id === currentDrag.id) {
          const isDetector = item.type === 'DETECTOR';
          const isSideActive = ['WALL', 'HUTCH', 'CHAMBER', 'DETECTOR', 'ANCHOR', 'ANCHOR_SIDE'].includes(item.type);
          const isTopActive = ['WALL', 'HUTCH', 'CHAMBER', 'DETECTOR', 'ANCHOR', 'ANCHOR_TOP'].includes(item.type);
          const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);
          
          const newDistance = parseFloat(((rawX - ORIGIN_X) / PX_PER_M).toFixed(2));
          
          let newHeight = item.height ?? 0;
          let newY = item.y;
          let newOffset = item.offset ?? 0;
          let newZ = item.z;
          let newStayInPath = item.stayInPath;

          if (view === 'SIDE' && isSideActive) {
            const dyFromStart = Math.abs(e.clientY - (currentDrag.startY ?? e.clientY)) / zoom;
            if (isDetector && item.stayInPath !== false && dyFromStart < 8) {
              // Dragging primarily horizontally along beamline - keep locked in optical path
              newHeight = item.height ?? 0;
              newY = item.y;
              newStayInPath = true;
            } else {
              newHeight = parseFloat(((150 - rawSecondary) / PX_PER_M).toFixed(2));
              newY = rawSecondary;
              if (isDetector && dyFromStart >= 8) {
                newStayInPath = false;
              }
            }
          }

          if (view === 'TOP' && isTopActive) {
            const dzFromStart = Math.abs(e.clientY - (currentDrag.startY ?? e.clientY)) / zoom;
            if (isDetector && item.stayInPath !== false && dzFromStart < 8) {
              // Dragging primarily horizontally along beamline - keep locked in optical path
              newOffset = item.offset ?? 0;
              newZ = item.z;
              newStayInPath = true;
            } else {
              newOffset = parseFloat(((rawSecondary - 150) / PX_PER_M).toFixed(2));
              newZ = rawSecondary;
              if (isDetector && dzFromStart >= 8) {
                newStayInPath = false;
              }
            }
          }

          let updatedItem = {
            ...item,
            x: rawX,
            distance: newDistance,
            height: newHeight,
            offset: newOffset,
            y: newY,
            z: newZ,
            ...(isDetector && newStayInPath !== undefined ? { stayInPath: newStayInPath } : {})
          };

          if (isRange) {
             const halfWMeters = (item.dimX ?? 0) / 2 / PX_PER_M;
             updatedItem.start = parseFloat((newDistance - halfWMeters).toFixed(2));
             updatedItem.end = parseFloat((newDistance + halfWMeters).toFixed(2));
          } else if (item.type === 'SOURCE') {
             const sLen = getItemLengthM(item);
             updatedItem.end = newDistance;
             updatedItem.start = parseFloat((newDistance - sLen).toFixed(3));
          } else {
             // Translate chamber footprint envelope synchronously with parent optic
             const startChamberStart = currentDrag.startChamberStart !== undefined 
               ? currentDrag.startChamberStart 
               : getItemBoundsM(item).start;
             const startChamberEnd = currentDrag.startChamberEnd !== undefined 
               ? currentDrag.startChamberEnd 
               : getItemBoundsM(item).end;
             const startDist = currentDrag.startDist !== undefined 
               ? currentDrag.startDist 
               : (item.distance ?? newDistance);
             const delta = newDistance - startDist;
             updatedItem.start = parseFloat((startChamberStart + delta).toFixed(3));
             updatedItem.end = parseFloat((startChamberEnd + delta).toFixed(3));
          }

          return updatedItem;
        }
        return item;
      }));
    } else if (currentDrag.type === 'resize') {
      let dx = (e.clientX - currentDrag.startX) / zoom;
      let dy = (e.clientY - currentDrag.startY) / zoom;

      if (snapToGrid) {
        const dx_m = Math.round((dx / PX_PER_M) / SNAP_STEP_M) * SNAP_STEP_M;
        const dy_m = Math.round((dy / PX_PER_M) / SNAP_STEP_M) * SNAP_STEP_M;
        dx = dx_m * PX_PER_M;
        dy = dy_m * PX_PER_M;
      }

      setItems(prevItems => prevItems.map(item => {
        if (item.id === currentDrag.id) {
          const newW = Math.max(GRID_SIZE, currentDrag.startW + dx);
          const newH = Math.max(GRID_SIZE, view === 'SIDE' ? currentDrag.startH - dy : currentDrag.startH + dy);

          const isSideActive = ['WALL', 'HUTCH'].includes(item.type);
          const isTopActive = ['WALL', 'HUTCH'].includes(item.type);
          const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(item.type);

          const newX = currentDrag.startXPos + (newW - currentDrag.startW) / 2;
          
          let newSecondary = currentDrag.startSecondaryPos + (newH - currentDrag.startH) / 2;
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
    } else if (currentDrag.type === 'label') {
      const dist = Math.hypot(e.clientX - (currentDrag.startX ?? e.clientX), e.clientY - (currentDrag.startY ?? e.clientY));
      if (dist > 4) {
        currentDrag.hasMoved = true;
      }
      const dx = (e.clientX - currentDrag.startX) / zoom;
      const dy = (e.clientY - currentDrag.startY) / zoom;
      setItems(items.map(item => {
        if (item.id === currentDrag.id) {
          return {
            ...item,
            labelOffsets: {
              ...(item.labelOffsets || {}),
              [view]: {
                x: currentDrag.startOffsetX + dx,
                y: currentDrag.startOffsetY + dy
              }
            }
          }
        }
        return item;
      }));
    }
  };

  const handlePointerUp = () => {
    const currentDrag = draggingInfoRef.current || draggingInfo;
    if (currentDrag?.type === 'component' || currentDrag?.type === 'label') {
      if (!currentDrag.hasMoved) {
        cancelFocusItem();
        const targetId = currentDrag.id;
        focusItemTimerRef.current = setTimeout(() => {
          focusItem(targetId);
          focusItemTimerRef.current = null;
        }, 40);
      }
      if (currentDrag.type === 'component') {
        setItems(prev => [...prev].sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      }
    }
    updateDraggingInfo(null);
  };

  const handleLabelDoubleClick = (e, id, defaultText, view = null) => {
    e?.stopPropagation?.();
    cancelFocusItem();
    setSelectedId(id);
    updateDraggingInfo(null);
    setEditingLabel({ id, text: defaultText, view });
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
          } else if (['start', 'end', 'chamberLength', 'footprintLength'].includes(propName)) {
            const constraint = i.lockLength ? 'LOCK_LENGTH' : (i.lockCenter ? 'LOCK_CENTER' : 'ADJUST_LENGTH');
            return calculateUpdatedBounds(i, propName, val, constraint);
          } else if (['physicalLength', 'opticLength'].includes(propName)) {
            return calculateUpdatedBounds(i, 'physicalLength', val);
          } else if (propName === 'stayInPath') {
            updated.stayInPath = Boolean(val);
            if (val === true) {
              const comp = computedItemsRef.current?.find(c => c.id === i.id);
              if (comp) {
                updated.y = comp.y;
                updated.z = comp.z;
                updated.height = parseFloat(((150 - comp.y) / PX_PER_M).toFixed(3));
                updated.offset = parseFloat(((comp.z - 150) / PX_PER_M).toFixed(3));
              }
            }
          } else if (propName === 'freeDownstream') {
            updated.freeDownstream = Boolean(val);
          } else if (propName === 'showFootprint') {
            updated.showFootprint = Boolean(val);
          } else if (propName === 'showFootprintText') {
            updated.showFootprintText = Boolean(val);
          } else if (propName === 'isLocked') {
            updated.isLocked = Boolean(val);
          } else if (propName === 'lockLength') {
            updated.lockLength = Boolean(val);
            if (val) updated.lockCenter = false;
          } else if (propName === 'lockCenter') {
            updated.lockCenter = Boolean(val);
            if (val) updated.lockLength = false;
          } else if (propName === 'length' && !isNaN(val) && val !== '') {
            return calculateUpdatedBounds(i, 'physicalLength', val);
          } else if (propName === 'distance' && !isNaN(val) && val !== '') {
            return calculateUpdatedBounds(i, 'distance', val);
          } else if (['VDCM', 'HDCM'].includes(i.type)) {
            if (propName === 'housingLength' || propName === 'chamberLength') {
              if (val === undefined || val === '') {
                delete updated.housingLength;
                const chLen = 1.5;
                updated.chamberLength = chLen;
                updated.length = chLen;
                updated.physicalLength = chLen;
                updated.dimX = chLen * PX_PER_M;
              } else {
                const num = parseFloat(val);
                if (!isNaN(num) && num > 0) {
                  updated.housingLength = num;
                  updated.chamberLength = num;
                  updated.length = num;
                  updated.physicalLength = num;
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
              const chLen = updated.chamberLength ?? (updated.housingLength !== undefined ? Number(updated.housingLength) : 1.5);
              updated.dimX = chLen * PX_PER_M;
            }
          }
          if (propName === 'wallWidth' && !isNaN(val) && val !== '') {
            const w = Number(val);
            updated.wallWidth = w;
            updated.dimZ = w * PX_PER_M;
          } else if (propName === 'wallHeight' && !isNaN(val) && val !== '') {
            const h = Number(val);
            updated.wallHeight = h;
            updated.height = h;
            updated.dimY = h * PX_PER_M;
            updated.y = 200 - (h * PX_PER_M) / 2;
          } else if (propName === 'height' && !isNaN(val) && val !== '') {
            const h = Number(val);
            if (['SOURCE', 'DETECTOR'].includes(i.type)) {
              updated.height = h;
              updated.y = 150 - (h * PX_PER_M);
              if (i.type === 'DETECTOR') updated.stayInPath = false;
            } else if (['WALL', 'HUTCH'].includes(i.type)) {
              updated.height = h;
              updated.wallHeight = h;
              updated.dimY = h * PX_PER_M;
              if (updated.wallWidth === undefined) updated.dimZ = h * PX_PER_M;
              updated.y = 200 - (h * PX_PER_M) / 2;
            }
          } else if (propName === 'offset' && !isNaN(val) && val !== '') {
            if (['SOURCE', 'DETECTOR'].includes(i.type)) {
              const o = Number(val);
              updated.offset = o;
              updated.z = 150 + (o * PX_PER_M);
              if (i.type === 'DETECTOR') updated.stayInPath = false;
            }
          }
          return updated;
        }
        return i;
      }));
    }
  };

  const handleImportCsv = (csvText) => {
    // Restore total canvas / beamline length from CSV header comment if present
    const lengthMatch = typeof csvText === 'string' && csvText.match(/Total Beamline Length:\s*([\d.]+)\s*m/i);
    if (lengthMatch && !isNaN(parseFloat(lengthMatch[1])) && parseFloat(lengthMatch[1]) > 0) {
      setCanvasLength(parseFloat(lengthMatch[1]));
    }
    const importedItems = parseCsvToItems(csvText);
    if (importedItems && importedItems.length > 0) {
      setItems(importedItems);
      setSelectedId(null);
      setTimeout(() => handleFitToScreen(importedItems), 60);
      return true;
    }
    return false;
  };

  return {
    items, setItems, selectedId, setSelectedId, draggingInfo, setDraggingInfo,
    editingLabel, setEditingLabel, placingType, setPlacingType, ghostPos, setGhostPos,
    zoom, setZoom, showGrid, setShowGrid, snapToGrid, setSnapToGrid, showRuler, setShowRuler,
    showAnnotations, setShowAnnotations,
    canvasLength, setCanvasLength, showUI, setShowUI, activeView, setActiveView: handleSetActiveView,
    lastClickedView, setLastClickedView,
    isSettingsModalOpen, setIsSettingsModalOpen, canvasSettings, setCanvasSettings,
    isTableOpen, setIsTableOpen, tableViewMode, setTableViewMode, isCadExportOpen, setIsCadExportOpen,
    pan, setPan, sideViewRef, topViewRef, sideScrollRef, topScrollRef,
    selectedItem, sourceItem, canvasWidth, handleWheel, loadTemplate, handleClearAll,
    handleFitToScreen, focusItem, cancelFocusItem, handleBgPointerDown,
    handlePointerDown, handleResizePointerDown, handleLabelPointerDown, handlePointerMove,
    handlePointerUp, handleLabelDoubleClick, addItem, deleteSelected, updateItemProp,
    handleImportCsv, setComputedItems, templateList, refreshTemplates,
    loadedFileName, setLoadedFileName
  };
};
