import { useState, useRef, useEffect } from 'react';
import { TYPES, ORIGIN_X, PX_PER_M, GRID_SIZE, templates } from '../constants';
import { mapTemplateToItems } from '../utils';

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
  const [canvasLength, setCanvasLength] = useState(50);
  const [showUI, setShowUI] = useState(true);
  const [activeView, setActiveView] = useState('BOTH'); 
  const [lastClickedView, setLastClickedView] = useState('SIDE');

  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  
  const [pan, setPan] = useState({
    TOP: { x: 50, y: 100 },
    SIDE: { x: 50, y: 100 }
  });
  
  const sideViewRef = useRef(null);
  const topViewRef = useRef(null);
  const sideScrollRef = useRef(null);
  const topScrollRef = useRef(null);

  const selectedItem = items.find(i => i.id === selectedId);
  const sourceItem = items.find(i => i.type === 'SOURCE') || {};

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setPlacingType(null);
        setGhostPos(null);
        setEditingLabel(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

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
    setItems(mapTemplateToItems(selectedTemplate));
    setSelectedId(null);
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
        distance: item.distance ?? 0,
        height: item.height ?? 0,
        offset: item.offset ?? 0
      };

      if (!['FILTER', 'SLIT', 'SCREEN', 'WALL', 'HUTCH'].includes(item.type)) {
        exportItem.length = item.length ?? (TYPES[item.type].defaultLength || (item.dimX / PX_PER_M));
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
        const isRange = ['WALL', 'HUTCH'].includes(item.type);
        const h = item.height ?? 0;
        const o = item.offset ?? 0;
        const y = isRange ? 200 - (h * PX_PER_M) / 2 : 150 - (h * PX_PER_M);
        const z = isRange ? 150 : 150 + (o * PX_PER_M);
        const dimY = isRange ? (h * PX_PER_M) : undefined;
        const dimZ = isRange ? (h * PX_PER_M) : undefined;
        let x = ORIGIN_X + (item.distance || 0) * PX_PER_M;
        let dimX = item.dimX ?? TYPES[item.type]?.width ?? 20;
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
      setItems(newItems.sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      setIsJsonModalOpen(false);
    } catch (err) {
      alert("Invalid JSON format: " + err.message);
    }
  };

  const handleFitToScreen = () => {
    const viewRef = topScrollRef.current || sideScrollRef.current;
    if (!viewRef) return;
    const containerW = viewRef.clientWidth;
    const containerH = viewRef.clientHeight;
    let minX = Infinity, maxX = -Infinity;
    items.forEach(i => {
      const conf = TYPES[i.type];
      const w = i.dimX ?? conf.width;
      if (i.x < minX) minX = i.x;
      if (i.x + w > maxX) maxX = i.x + w;
    });
    if (minX === Infinity) { minX = 0; maxX = 1000; }
    const padding = 150; 
    const contentW = (maxX - minX) + padding * 2;
    let newZoom = containerW / contentW;
    newZoom = Math.max(0.1, Math.min(newZoom, 2.5));
    setZoom(newZoom);
    const targetPanX = containerW / 2 - ((minX + maxX) / 2) * newZoom;
    const targetPanY = containerH / 2 - 150 * newZoom; 
    setPan({
      TOP: { x: targetPanX, y: targetPanY },
      SIDE: { x: targetPanX, y: targetPanY }
    });
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
        rawX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
        rawSecondary = Math.round(rawSecondary / GRID_SIZE) * GRID_SIZE;
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
        ...(placingType === 'SOURCE' ? { sourceType: 'Undulator' } : {}),
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
    const startOffsetX = item.labelOffsets?.[view]?.x !== undefined ? item.labelOffsets[view].x : (item.type === 'SOURCE' ? -(conf.width / 2) : 0);
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
        rawX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
        rawSecondary = Math.round(rawSecondary / GRID_SIZE) * GRID_SIZE;
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
        rawX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
        rawSecondary = Math.round(rawSecondary / GRID_SIZE) * GRID_SIZE;
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
          }

          return updatedItem;
        }
        return item;
      }));
    } else if (draggingInfo.type === 'resize') {
      let dx = (e.clientX - draggingInfo.startX) / zoom;
      let dy = (e.clientY - draggingInfo.startY) / zoom;

      if (snapToGrid) {
        dx = Math.round(dx / GRID_SIZE) * GRID_SIZE;
        dy = Math.round(dy / GRID_SIZE) * GRID_SIZE;
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

  const handlePointerUp = () => setDraggingInfo(null);

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
      setItems(items.filter(i => i.id !== selectedId));
      setSelectedId(null);
    }
  };

  const updateItemProp = (propName, val) => {
    if (selectedId) {
      setItems(items.map(i => {
        if (i.id === selectedId) {
          const updated = { ...i, [propName]: val };
          if (propName === 'length' && !isNaN(val) && val !== '') {
            updated.dimX = Number(val) * PX_PER_M;
          }

          if (['WALL', 'HUTCH', 'CHAMBER'].includes(i.type)) {
            const s = propName === 'start' ? Number(val) : (i.start ?? 0);
            const e = propName === 'end' ? Number(val) : (i.end ?? 0);
            const startX = ORIGIN_X + s * PX_PER_M;
            const endX = ORIGIN_X + e * PX_PER_M;
            updated.x = (startX + endX) / 2;
            updated.dimX = Math.abs(endX - startX);
            updated.distance = (s + e) / 2;
          } else if (['VDCM', 'HDCM'].includes(i.type)) {
            const d = propName === 'exitOffset' ? Number(val) : (i.exitOffset ?? 0.5);
            const a = propName === 'braggAngle' ? Number(val) : (i.braggAngle ?? 20);
            const tan2theta = Math.tan(2 * a * Math.PI / 180);
            const L = Math.abs(tan2theta) > 0.001 ? Math.abs((d * PX_PER_M) / tan2theta) : 40;
            updated.dimX = L + 80; 
            if (propName === 'distance' && !isNaN(val) && val !== '') {
               updated.x = ORIGIN_X + Number(val) * PX_PER_M;
            }
          } else if (propName === 'distance' && !isNaN(val) && val !== '') {
            updated.x = ORIGIN_X + Number(val) * PX_PER_M;
          }
          if (propName === 'height' && !isNaN(val) && val !== '') {
            updated.y = 150 - (Number(val) * PX_PER_M);
          } else if (propName === 'offset' && !isNaN(val) && val !== '') {
            updated.z = 150 + (Number(val) * PX_PER_M);
          }
          return updated;
        }
        return i;
      }).sort((a, b) => (a.distance || 0) - (b.distance || 0)));
    }
  };

  return {
    items, setItems, selectedId, setSelectedId, draggingInfo, setDraggingInfo,
    editingLabel, setEditingLabel, placingType, setPlacingType, ghostPos, setGhostPos,
    widgetPos, setWidgetPos, isDraggingWidget, setIsDraggingWidget, widgetDragRef,
    zoom, setZoom, showGrid, setShowGrid, snapToGrid, setSnapToGrid, showRuler, setShowRuler,
    canvasLength, setCanvasLength, showUI, setShowUI, activeView, setActiveView,
    lastClickedView, setLastClickedView, isJsonModalOpen, setIsJsonModalOpen,
    jsonText, setJsonText, pan, setPan, sideViewRef, topViewRef, sideScrollRef, topScrollRef,
    selectedItem, sourceItem, canvasWidth, handleWheel, loadTemplate, handleClearAll,
    handleOpenJsonModal, handleApplyJson, handleFitToScreen, handleBgPointerDown,
    handlePointerDown, handleResizePointerDown, handleLabelPointerDown, handlePointerMove,
    handlePointerUp, handleLabelDoubleClick, addItem, deleteSelected, updateItemProp
  };
};
