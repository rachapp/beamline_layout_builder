import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Settings2, Trash2, Plus, Layers, Grid, Magnet, Moon, Sun, PanelLeftClose, PanelLeftOpen, Maximize, Ruler, GripHorizontal, Zap, FileJson } from 'lucide-react';

import layoutConfig from './layout.json';
import templates from './templates.json';

// --- COMPONENT DEFINITIONS ---
const TYPES = {
  SOURCE: { id: 'SOURCE', name: 'Source', width: 80, height: 24 },
  SLIT: { id: 'SLIT', name: 'Slit', width: 4, height: 60 },
  FILTER: { id: 'FILTER', name: 'Filter', width: 12, height: 40 },
  GRATING: { id: 'GRATING', name: 'Grating', width: 40, height: 16 },
  WALL: { id: 'WALL', name: 'Wall', width: 24, height: 140 },
  XBPM: { id: 'XBPM', name: 'XBPM', width: 24, height: 24 },
  HUTCH: { id: 'HUTCH', name: 'Hutch', width: 340, height: 140 },
  VDCM: { id: 'VDCM', name: 'VDCM', width: 80, height: 60 },
  HDCM: { id: 'HDCM', name: 'HDCM', width: 80, height: 60 },
  VFM: { id: 'VFM', name: 'VFM', width: 80, height: 12 },
  HFM: { id: 'HFM', name: 'HFM', width: 80, height: 12 },
  SAMPLE: { id: 'SAMPLE', name: 'Sample', width: 24, height: 24 },
  SCREEN: { id: 'SCREEN', name: 'Screen', width: 8, height: 40 },
  DETECTOR: { id: 'DETECTOR', name: 'Detector', width: 30, height: 40 }
};

// --- ABSOLUTE METRIC COORDINATE MAPPING ---
// 1 physical meter = 20 pixels visually. Origin X (0m) starts at 160px.
const ORIGIN_X = 160; 
const PX_PER_M = 20;
const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b', '#0f172a'];

const INITIAL_LAYOUT = layoutConfig
  .filter(item => item.type)
  .map((item, idx) => {
    const isRange = ['WALL', 'HUTCH'].includes(item.type);
    let x = ORIGIN_X + (item.distance || 0) * PX_PER_M;
    let dimX = item.dimX ?? TYPES[item.type].width;
    
    const h = item.height ?? (isRange ? (TYPES[item.type].height / PX_PER_M) : 0);
    const o = item.offset ?? 0;
    const y = isRange ? 200 - (h * PX_PER_M) / 2 : 150 - (h * PX_PER_M);
    const z = isRange ? 150 : 150 + (o * PX_PER_M);
    const dimY = isRange ? (h * PX_PER_M) : undefined;
    const dimZ = isRange ? (h * PX_PER_M) : undefined;

    if (isRange && item.start !== undefined && item.end !== undefined) {
      const startX = ORIGIN_X + item.start * PX_PER_M;
      const endX = ORIGIN_X + item.end * PX_PER_M;
      x = (startX + endX) / 2;
      dimX = Math.abs(endX - startX);
    } else if (isRange) {
      // Default fallback if start/end missing but is range type
      const d = item.distance ?? 0;
      const wMeters = (item.dimX ?? TYPES[item.type].width) / PX_PER_M;
      item.start = d - wMeters / 2;
      item.end = d + wMeters / 2;
    }

    return {
      ...item,
      id: item.id || (idx + 1),
      x,
      dimX,
      y,
      z,
      height: h,
      offset: o,
      distance: isRange ? ((item.start ?? 0) + (item.end ?? 0)) / 2 : (item.distance ?? 0),
      start: item.start,
      end: item.end
    };
  });

const GRID_SIZE = 20;

export default function App() {
  const [items, setItems] = useState(INITIAL_LAYOUT);
  const [selectedId, setSelectedId] = useState(null);
  const [draggingInfo, setDraggingInfo] = useState(null); 
  const [editingLabel, setEditingLabel] = useState(null); 
  
  // Placement Mode States
  const [placingType, setPlacingType] = useState(null);
  const [ghostPos, setGhostPos] = useState(null);

  // Floating Widget Drag States
  const [widgetPos, setWidgetPos] = useState({ x: 1000, y: 80 });
  const [isDraggingWidget, setIsDraggingWidget] = useState(false);
  const widgetDragRef = useRef({ offsetX: 0, offsetY: 0 });

  // UI & Canvas States
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showRuler, setShowRuler] = useState(true);
  const [canvasLength, setCanvasLength] = useState(50);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [activeView, setActiveView] = useState('BOTH'); 
  const [lastClickedView, setLastClickedView] = useState('SIDE');

  // JSON Import/Export States
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  
  // Infinite Canvas Pan State
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

  // Global Escape Listener to cancel placement
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

  // Global Pointer Listeners for Widget Dragging
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

  // --- DYNAMIC CANVAS BOUNDS ---
  const canvasWidth = ORIGIN_X + (canvasLength + 10) * PX_PER_M; 

  // --- THEME DEFINITIONS ---
  const theme = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    canvasBg: isDarkMode ? '#1e293b' : '#f1f5f9',
    grid: isDarkMode ? 'radial-gradient(circle at 0px 0px, #334155 1.5px, transparent 0)' : 'radial-gradient(circle at 0px 0px, #cbd5e1 1.5px, transparent 0)',
    beam: isDarkMode ? '#f87171' : '#ef4444',
    compBorder: isDarkMode ? '#94a3b8' : '#1f2937',
    compBg: isDarkMode ? '#0f172a' : '#ffffff',
    inactiveBg: isDarkMode ? '#334155' : '#e2e8f0',
    inactiveBorder: isDarkMode ? '#475569' : '#94a3b8',
    text: isDarkMode ? 'text-slate-200' : 'text-slate-700',
    panelBg: isDarkMode ? 'bg-slate-900' : 'bg-white',
    panelBorder: isDarkMode ? 'border-slate-800' : 'border-gray-200',
    buttonBg: isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-slate-50 border-slate-200',
    badgeBg: isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-gray-200',
    widgetBg: isDarkMode ? 'bg-slate-800 border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' : 'bg-white border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
  };

  const rayColor = sourceItem.rayColor || theme.beam;
  const rayWidth = sourceItem.rayWidth ?? 1.5;
  const rayStyle = sourceItem.rayStyle || 'dashed';
  const showArrow = sourceItem.showArrow !== false;

  let strokeDasharray = 'none';
  if (rayStyle === 'dashed') strokeDasharray = '8,4';
  if (rayStyle === 'dotted') strokeDasharray = '2,4';

  const getDefaultColors = (type) => {
    switch(type) {
      case 'SOURCE': return { primary: '#ef4444', secondary: '#2563eb' };
      case 'SLIT': return { primary: theme.compBorder, secondary: 'transparent' };
      case 'FILTER': return { primary: '#fbbf24', secondary: theme.compBorder };
      case 'GRATING': return { primary: isDarkMode ? '#475569' : '#cbd5e1', secondary: isDarkMode ? '#94a3b8' : '#64748b' };
      case 'WALL': return { primary: isDarkMode ? '#ffffff' : '#000000', secondary: theme.compBg };
      case 'HUTCH': return { primary: isDarkMode ? '#475569' : '#94a3b8', secondary: 'transparent' };
      case 'XBPM': return { primary: theme.compBorder, secondary: '#ef4444' };
      case 'SCREEN': return { primary: '#22c55e', secondary: '#22c55e' };
      case 'VDCM': case 'HDCM': return { primary: '#0891b2', secondary: isDarkMode ? '#164e63' : '#cffafe' };
      case 'VFM': case 'HFM': return { primary: theme.compBorder, secondary: isDarkMode ? '#475569' : '#cbd5e1' };
      case 'SAMPLE': return { primary: theme.compBorder, secondary: theme.compBorder };
      case 'DETECTOR': return { primary: theme.compBg, secondary: theme.compBorder };
      default: return { primary: theme.compBorder, secondary: theme.compBg };
    }
  };

  // --- FORWARD KINEMATICS PHYSICS ENGINE (SORTED BY PHYSICAL DISTANCE) ---
  const { computedItems, tracePointsSide, tracePointsTop } = useMemo(() => {
    const sorted = [...items].sort((a, b) => (a.distance || 0) - (b.distance || 0));

    const computePlane = (plane) => {
      const isSide = plane === 'y';
      const isBender = (type) => isSide ? type === 'VFM' : type === 'HFM';
      const isShifter = (type) => isSide ? type === 'VDCM' : type === 'HDCM';

      let tPoints = [];
      let cItemsMap = {};

      // 1. Process Architectural Elements strictly anchored to floor in Side View
      sorted.forEach(item => {
        if (['WALL', 'HUTCH'].includes(item.type)) {
          let val = item[plane];
          if (plane === 'y') {
            const conf = TYPES[item.type];
            const h = item.dimY ?? conf.height;
            val = 200 - h / 2; 
          }
          cItemsMap[item.id] = { ...item, [plane]: val };
        }
      });

      // 2. Process Traceable Optics
      const tracedItems = sorted.filter(i => !['WALL', 'HUTCH'].includes(i.type));
      const sourceIndex = tracedItems.findIndex(i => i.type === 'SOURCE');
      const startIndex = sourceIndex >= 0 ? sourceIndex : 0;
      const source = tracedItems[startIndex];
      
      if (!source) return { tPoints, cItemsMap };

      let currSlope = 0;
      let prevDist = source.distance || 0;
      let currVal = source[plane];
      let beamActive = true; 

      for (let i = 0; i < startIndex; i++) {
        cItemsMap[tracedItems[i].id] = { ...tracedItems[i], [plane]: currVal };
      }

      cItemsMap[source.id] = { ...source, [plane]: currVal };
      tPoints.push({ x: source.x, [plane]: currVal, parentId: source.id, sub: 0 });

      for (let i = startIndex + 1; i < tracedItems.length; i++) {
        const item = tracedItems[i];
        const isGratingActive = item.type === 'GRATING' && ((plane === 'y' && (item.orientation || 'Vertical') === 'Vertical') || (plane === 'z' && item.orientation === 'Horizontal'));

        if (isShifter(item.type)) {
          const x_C1 = item.x - 20;
          const val_C1 = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: x_C1, [plane]: val_C1, parentId: item.id, sub: 1 });

          const offset = (item[plane] < val_C1) ? -24 : 24;
          const val_C2 = val_C1 + offset;
          const x_C2 = item.x + 20;
          if (beamActive) tPoints.push({ x: x_C2, [plane]: val_C2, parentId: item.id, sub: 2 });

          currVal = val_C2;
          prevDist = item.distance;
          cItemsMap[item.id] = { ...item, [plane]: (val_C1 + val_C2) / 2 };

        } else if (isBender(item.type)) {
          const hitVal = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: item.x, [plane]: hitVal, parentId: item.id, sub: 0 });
          cItemsMap[item.id] = { ...item, [plane]: hitVal };

          let nextAnchor = null;
          for (let j = i + 1; j < tracedItems.length; j++) {
            if (isBender(tracedItems[j].type) || tracedItems[j].type === 'DETECTOR') {
              nextAnchor = tracedItems[j];
              break;
            }
          }

          if (nextAnchor) {
            const distDiff = Math.max(0.001, nextAnchor.distance - item.distance);
            currSlope = (nextAnchor[plane] - hitVal) / distDiff;
          }
          currVal = hitVal;
          prevDist = item.distance;

        } else if (isGratingActive) {
          const hitVal = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: item.x, [plane]: hitVal, parentId: item.id, sub: 0 });
          cItemsMap[item.id] = { ...item, [plane]: hitVal };
          
          const parsedDeflect = parseFloat(item.diffractAngle);
          const actualDeflect = isNaN(parsedDeflect) ? 15 : parsedDeflect;
          
          const incidentAngle = Math.atan2(currSlope, PX_PER_M);
          const outAngle = incidentAngle + (actualDeflect * Math.PI / 180);
          
          currSlope = Math.tan(outAngle) * PX_PER_M;
          currVal = hitVal;
          prevDist = item.distance;

        } else {
          const hitVal = currVal + currSlope * (item.distance - prevDist);
          if (beamActive) tPoints.push({ x: item.x, [plane]: hitVal, parentId: item.id, sub: 0 });
          cItemsMap[item.id] = { ...item, [plane]: hitVal };
          
          currVal = hitVal;
          prevDist = item.distance;
        }

        // Handle beam stopping logic securely
        if ((item.type === 'SAMPLE' && item.passLight === false) || (item.type === 'DETECTOR' && item.passLight !== true)) {
           beamActive = false; 
        }
      }
      return { tPoints, cItemsMap };
    };

    const sideData = computePlane('y');
    const topData = computePlane('z');

    const mergedItems = items.map(item => ({
      ...item,
      y: sideData.cItemsMap[item.id]?.y !== undefined ? sideData.cItemsMap[item.id].y : item.y,
      z: topData.cItemsMap[item.id]?.z !== undefined ? topData.cItemsMap[item.id].z : item.z,
    }));

    return {
      computedItems: mergedItems,
      tracePointsSide: sideData.tPoints,
      tracePointsTop: topData.tPoints
    };
  }, [items]);

  // --- INTERACTIVE ACTIONS ---
  const handleWheel = (e, view, scrollRef) => {
    if (placingType || !scrollRef.current) return;
    
    // Zoom sensitivity logic targeted to cursor position
    const rect = scrollRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomSensitivity = 0.0015;
    const zoomFactor = 1 - e.deltaY * zoomSensitivity;
    let newZoom = zoom * zoomFactor;
    newZoom = Math.max(0.1, Math.min(newZoom, 2.5));

    // Math to shift the pan so the mouse point doesn't move relative to the screen
    const newPanX = mouseX - (mouseX - pan[view].x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan[view].y) * (newZoom / zoom);

    const otherView = view === 'TOP' ? 'SIDE' : 'TOP';
    
    setZoom(newZoom);
    setPan(prev => ({
      ...prev,
      [view]: { x: newPanX, y: newPanY },
      [otherView]: { x: newPanX, y: prev[otherView].y } // Horizontal sync
    }));
  };

  // --- TEMPLATE ACTIONS ---
  const loadTemplate = (templateName) => {
    const selectedTemplate = templates[templateName];
    if (!selectedTemplate) return;

    const newItems = selectedTemplate.map((item, idx) => {
      const isRange = ['WALL', 'HUTCH'].includes(item.type);
      const h = item.height ?? 0;
      const o = item.offset ?? 0;
      const y = 150 - (h * PX_PER_M);
      const z = 150 + (o * PX_PER_M);
      let x = ORIGIN_X + (item.distance || 0) * PX_PER_M;
      let dimX = item.dimX ?? TYPES[item.type].width;

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
      }

      return {
        ...item,
        id: Date.now() + idx,
        x, y, z, dimX, start, end,
        height: h, offset: o,
        distance: isRange ? (start + end) / 2 : (item.distance ?? 0)
      };
    });
    setItems(newItems);
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
    const cleanItems = items.map((item) => {
      const isRange = ['WALL', 'HUTCH'].includes(item.type);
      const { id, x, y, z, dimX, dimY, dimZ, labelOffsets, ...rest } = item;
      
      const conf = TYPES[item.type];
      let defaultName = conf?.name || item.type;
      if (item.type === 'SOURCE') defaultName = item.sourceType || 'Undulator';
      if (item.type === 'DETECTOR') defaultName = item.detectorType || 'Detector';
      
      const customName = item.customName || defaultName;

      if (isRange) {
        return {
           type: item.type,
           start: item.start,
           end: item.end,
           height: item.height,
           customName
        };
      }

      return {
        ...rest,
        distance: item.distance,
        height: item.height,
        offset: item.offset,
        customName
      };
    });
    setJsonText(JSON.stringify(cleanItems, null, 2));
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
        const y = 150 - (h * PX_PER_M);
        const z = 150 + (o * PX_PER_M);
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
        }

        return {
          ...item,
          id: Date.now() + idx,
          x, y, z, dimX, start, end,
          height: h, offset: o,
          distance: isRange ? (start + end) / 2 : (item.distance ?? 0)
        };
      });

      setItems(newItems);
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
    if (e.button !== 0) return; 

    if (placingType && ghostPos) {
      const newDistance = parseFloat(((ghostPos.x - ORIGIN_X) / PX_PER_M).toFixed(2));
      const finalX = ORIGIN_X + newDistance * PX_PER_M; 
      
      const isRange = ['WALL', 'HUTCH'].includes(placingType);
      const conf = TYPES[placingType];
      const h = conf.height / PX_PER_M;
      
      const newItem = { 
        id: Date.now(), 
        type: placingType, 
        x: finalX, 
        y: view === 'SIDE' ? ghostPos.y : 150, 
        z: view === 'TOP' ? ghostPos.y : 150,
        distance: newDistance,
        height: view === 'SIDE' ? parseFloat(((150 - ghostPos.y) / PX_PER_M).toFixed(2)) : 0,
        offset: view === 'TOP' ? parseFloat(((ghostPos.y - 150) / PX_PER_M).toFixed(2)) : 0,
        customName: conf.name,
        ...(placingType === 'SOURCE' ? { sourceType: 'Undulator' } : {}),
        ...(isRange ? { 
           start: parseFloat((newDistance - (conf.width / 2 / PX_PER_M)).toFixed(2)), 
           end: parseFloat((newDistance + (conf.width / 2 / PX_PER_M)).toFixed(2)),
           height: h,
           dimX: conf.width, dimY: conf.height, dimZ: conf.height,
           y: 200 - conf.height / 2
        } : {}),
        ...(placingType === 'GRATING' ? { orientation: 'Vertical', tiltAngle: 45, diffractAngle: 15 } : {}),
        ...(placingType === 'SAMPLE' ? { passLight: true } : {}),
        ...(placingType === 'DETECTOR' ? { passLight: false, detectorType: 'Silicon Detector' } : {})
      };
      setItems([...items, newItem]);
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

      setItems(items.map(item => {
        if (item.id === draggingInfo.id) {
          const isSideActive = ['SOURCE', 'VFM', 'VDCM', 'DETECTOR', 'WALL', 'HUTCH', 'SAMPLE'].includes(item.type);
          const isTopActive = ['SOURCE', 'HFM', 'HDCM', 'DETECTOR', 'WALL', 'HUTCH', 'GRATING', 'SAMPLE'].includes(item.type);
          const isRange = ['WALL', 'HUTCH'].includes(item.type);
          
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

      setItems(items.map(item => {
        if (item.id === draggingInfo.id) {
          const newW = Math.max(GRID_SIZE, draggingInfo.startW + dx);
          const newH = Math.max(GRID_SIZE, view === 'SIDE' ? draggingInfo.startH - dy : draggingInfo.startH + dy);

          const isSideActive = ['WALL', 'HUTCH'].includes(item.type);
          const isTopActive = ['WALL', 'HUTCH'].includes(item.type);

          const newX = draggingInfo.startXPos + (newW - draggingInfo.startW) / 2;
          
          let newSecondary = draggingInfo.startSecondaryPos + (newH - draggingInfo.startH) / 2;
          if (view === 'SIDE' && isSideActive) {
            newSecondary = 200 - newH / 2;
          }

          const newDistance = parseFloat(((newX - ORIGIN_X) / PX_PER_M).toFixed(1));

          return {
            ...item,
            dimX: newW,
            ...(view === 'SIDE' ? { dimY: newH } : { dimZ: newH }),
            x: newX,
            distance: newDistance,
            ...(view === 'SIDE' && isSideActive ? { y: newSecondary } : {}),
            ...(view === 'TOP' && isTopActive ? { z: newSecondary } : {})
          };
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

  // --- PALETTE ACTIONS ---
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
          
          if (['WALL', 'HUTCH'].includes(i.type)) {
            // Handle Range logic
            const s = propName === 'start' ? Number(val) : (i.start ?? 0);
            const e = propName === 'end' ? Number(val) : (i.end ?? 0);
            const startX = ORIGIN_X + s * PX_PER_M;
            const endX = ORIGIN_X + e * PX_PER_M;
            updated.x = (startX + endX) / 2;
            updated.dimX = Math.abs(endX - startX);
            updated.distance = (s + e) / 2;
          } else if (propName === 'distance' && !isNaN(val) && val !== '') {
            // Handle Point logic
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
      }));
    }
  };

  // --- VISUAL RENDERER ---
  const renderVisual = (item, viewType, tracePoints) => {
    const type = item.type;
    const planeCoord = viewType === 'SIDE' ? 'y' : 'z';
    
    const defaults = getDefaultColors(type);
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
          <div className="absolute rounded-none shadow-sm" style={{ backgroundColor: primary, width: '8px', height: '42%', top: 0, left: isTopView ? 0 : 'auto', right: isTopView ? 'auto' : 0 }} />
          <div className="absolute rounded-none shadow-sm" style={{ backgroundColor: primary, width: '8px', height: '42%', bottom: 0, left: isTopView ? 0 : 'auto', right: isTopView ? 'auto' : 0 }} />
          <div className="absolute rounded-none shadow-sm" style={{ backgroundColor: primary, width: '8px', height: '28%', top: '20%', left: isTopView ? 'auto' : 0, right: isTopView ? 0 : 'auto' }} />
          <div className="absolute rounded-none shadow-sm" style={{ backgroundColor: primary, width: '8px', height: '28%', bottom: '20%', left: isTopView ? 'auto' : 0, right: isTopView ? 0 : 'auto' }} />
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

      let rot1 = 0, rot2 = 0;
      let top1 = 42, top2 = 18; 

      if (tracePoints) {
        const idx1 = tracePoints.findIndex(p => p.parentId === item.id && p.sub === 1);
        const idx2 = tracePoints.findIndex(p => p.parentId === item.id && p.sub === 2);
        
        if (idx1 > 0 && idx2 !== -1 && idx2 < tracePoints.length - 1) {
           const prev = tracePoints[idx1 - 1];
           const p1 = tracePoints[idx1];
           const p2 = tracePoints[idx2];

           top1 = 30 + (p1[planeCoord] - item[planeCoord]);
           top2 = 30 + (p2[planeCoord] - item[planeCoord]);

           const angleIn1 = Math.atan2(p1[planeCoord] - prev[planeCoord], p1.x - prev.x);
           const angleOut1 = Math.atan2(p2[planeCoord] - p1[planeCoord], p2.x - p1.x);
           rot1 = (angleIn1 + angleOut1) / 2;
           if (angleIn1 < angleOut1) rot1 += Math.PI;

           rot2 = rot1 + Math.PI;
        }
      }

      const crystalStyle = { border: `1.5px solid ${primary}`, backgroundColor: secondary };
      const hatcingStyle = { backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'} 2px, ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)'} 4px)`};

      return (
        <div className="w-full h-full relative rounded-none" style={{ border: `1px dashed ${theme.inactiveBorder}` }}>
          <div className="absolute flex flex-col justify-end shadow-sm rounded-none"
               style={{ width: '28px', height: '10px', left: '20px', top: `${top1}px`, transformOrigin: '50% 0%', transform: `translate(-50%, 0%) rotate(${rot1}rad)`, ...crystalStyle}}>
            <div className="w-full h-1/2 opacity-50" style={hatcingStyle} />
          </div>
          <div className="absolute flex flex-col justify-end shadow-sm rounded-none"
               style={{ width: '28px', height: '10px', left: '60px', top: `${top2}px`, transformOrigin: '50% 0%', transform: `translate(-50%, 0%) rotate(${rot2}rad)`, ...crystalStyle}}>
            <div className="w-full h-1/2 opacity-50" style={hatcingStyle} />
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
  };

  // --- FLOATING PROPERTIES WIDGET ---
  const renderPropertiesWidget = () => {
    if (!selectedItem) return null;
    
    return (
      <div 
        className={`absolute z-[100] w-72 border rounded-md flex flex-col ${theme.widgetBg} ${theme.text}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{ left: widgetPos.x, top: widgetPos.y }}
      >
        <div 
           className={`flex items-center justify-between cursor-move p-3 border-b rounded-t-md ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-100 border-gray-200'}`}
           onPointerDown={(e) => {
             e.stopPropagation();
             setIsDraggingWidget(true);
             widgetDragRef.current = {
                offsetX: e.clientX - widgetPos.x,
                offsetY: e.clientY - widgetPos.y
             };
           }}
        >
           <div className="flex items-center gap-2 pointer-events-none">
             <GripHorizontal size={14} className="text-gray-400" />
             <span className="inline-block px-2 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-sm shadow-sm">
               {TYPES[selectedItem.type].name} Properties
             </span>
           </div>
           <button 
             onPointerDown={(e) => e.stopPropagation()}
             onClick={() => setSelectedId(null)} 
             className="text-gray-400 hover:text-red-500 font-bold p-1"
           >
             &times;
           </button>
        </div>

        <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div>
             <label className="block text-[10px] font-bold uppercase mb-1">Label Name</label>
             <input 
               type="text" 
               value={selectedItem.customName || ''} 
               placeholder={TYPES[selectedItem.type].name} 
               onChange={(e) => updateItemProp('customName', e.target.value)} 
               className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
             />
          </div>

          <div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Major Color</label>
                <input 
                  type="color" 
                  value={selectedItem.primaryColor || getDefaultColors(selectedItem.type).primary} 
                  onChange={(e) => updateItemProp('primaryColor', e.target.value)} 
                  className="w-full h-8 p-0 border-0 cursor-pointer" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Minor Color</label>
                <input 
                  type="color" 
                  value={selectedItem.secondaryColor || getDefaultColors(selectedItem.type).secondary} 
                  onChange={(e) => updateItemProp('secondaryColor', e.target.value)} 
                  className="w-full h-8 p-0 border-0 cursor-pointer" 
                />
              </div>
            </div>
            <button 
              onClick={() => {
                setItems(items.map(i => i.id === selectedId ? { ...i, primaryColor: undefined, secondaryColor: undefined } : i));
              }}
              className={`w-full p-1 border rounded-none text-[10px] font-bold transition-colors ${theme.buttonBg} ${theme.text}`}
            >
              Reset Colors to Default
            </button>
          </div>

          {selectedItem.type === 'SOURCE' && (
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Source Type</label>
              <select
                value={selectedItem.sourceType || 'Undulator'}
                onChange={(e) => updateItemProp('sourceType', e.target.value)}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              >
                <option value="Undulator">Undulator</option>
                <option value="Wiggler">Wiggler</option>
                <option value="Bending Magnet">Bending Magnet</option>
              </select>
            </div>
          )}

          {selectedItem.type === 'DETECTOR' && (
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Detector Type</label>
              <select
                value={selectedItem.detectorType || 'Silicon Detector'}
                onChange={(e) => updateItemProp('detectorType', e.target.value)}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
              >
                <option value="Ionization Chamber">Ionization Chamber</option>
                <option value="Silicon Detector">Silicon Detector</option>
                <option value="Image Plate">Image Plate</option>
                <option value="Strip Detector">Strip Detector</option>
              </select>
            </div>
          )}

          {selectedItem.type === 'GRATING' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase mb-1">Dispersion Plane</label>
                <select
                  value={selectedItem.orientation || 'Vertical'}
                  onChange={(e) => updateItemProp('orientation', e.target.value)}
                  className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                >
                  <option value="Vertical">Vertical (Side View)</option>
                  <option value="Horizontal">Horizontal (Top View)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Visual Tilt (°)</label>
                <input
                  type="number"
                  value={selectedItem.tiltAngle ?? 45}
                  onChange={(e) => updateItemProp('tiltAngle', e.target.value)}
                  className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1">Deflect Beam (°)</label>
                <input
                  type="number"
                  value={selectedItem.diffractAngle ?? 15}
                  onChange={(e) => updateItemProp('diffractAngle', e.target.value)}
                  className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                />
              </div>
            </div>
          )}

          {['SAMPLE', 'DETECTOR'].includes(selectedItem.type) && (
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedItem.type === 'DETECTOR' ? selectedItem.passLight === true : selectedItem.passLight !== false} 
                  onChange={(e) => updateItemProp('passLight', e.target.checked)} 
                  className="w-4 h-4 rounded" 
                />
                Pass Light Through
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
               <label className="block text-[10px] font-bold uppercase mb-1">Height (m)</label>
               <input
                 type="number"
                 step="0.1"
                 value={selectedItem.height ?? 0}
                 onChange={(e) => updateItemProp('height', e.target.value)}
                 className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
               />
            </div>
            <div>
               <label className="block text-[10px] font-bold uppercase mb-1">Offset (m)</label>
               <input
                 type="number"
                 step="0.1"
                 value={selectedItem.offset ?? 0}
                 onChange={(e) => updateItemProp('offset', e.target.value)}
                 className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
               />
            </div>
          </div>

          {['WALL', 'HUTCH'].includes(selectedItem.type) ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                 <label className="block text-[10px] font-bold uppercase mb-1">Start (m)</label>
                 <input
                   type="number"
                   step="0.1"
                   value={selectedItem.start ?? 0}
                   onChange={(e) => updateItemProp('start', e.target.value)}
                   className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                 />
              </div>
              <div>
                 <label className="block text-[10px] font-bold uppercase mb-1">End (m)</label>
                 <input
                   type="number"
                   step="0.1"
                   value={selectedItem.end ?? 0}
                   onChange={(e) => updateItemProp('end', e.target.value)}
                   className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                 />
              </div>
            </div>
          ) : (
            <div>
               <label className="block text-[10px] font-bold uppercase mb-1">Distance (m)</label>
               <input
                 type="number"
                 step="0.1"
                 value={selectedItem.distance ?? 0}
                 onChange={(e) => updateItemProp('distance', e.target.value)}
                 className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
               />
            </div>
          )}

          {['HUTCH', 'WALL'].includes(selectedItem.type) && (
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-blue-500">Construction Height / Width (m)</label>
              <input
                type="number"
                step="0.1"
                value={selectedItem.height ?? (TYPES[selectedItem.type].height / PX_PER_M)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setItems(items.map(i => {
                    if (i.id === selectedId) {
                       const h = isNaN(val) ? 0 : val;
                       return { 
                         ...i, 
                         height: h, 
                         dimY: h * PX_PER_M, 
                         dimZ: h * PX_PER_M,
                         y: 200 - (h * PX_PER_M) / 2
                       };
                    }
                    return i;
                  }));
                }}
                className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text} border-blue-400`}
              />
              <p className="text-[9px] opacity-60 mt-1 italic leading-tight">* Height applies to Side View. Width applies to Top View.</p>
            </div>
          )}

          {selectedItem.type === 'SOURCE' && (
            <div className="mt-2 pt-3 border-t border-dashed border-gray-400">
              <p className="text-[10px] font-bold uppercase mb-2">Ray Trace Setup</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <div className="flex gap-2 items-center">
                    <input type="color" value={selectedItem.rayColor || '#ef4444'} onChange={(e) => updateItemProp('rayColor', e.target.value)} className="w-8 h-8 p-0 border-0 cursor-pointer" />
                    <div className="flex flex-wrap gap-1 flex-1 items-center">
                      {PRESET_COLORS.slice(0,6).map(c => (
                          <button key={c} onClick={() => updateItemProp('rayColor', c)} className="w-4 h-4 rounded-full border border-gray-400" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1">Ray Width</label>
                  <input type="number" step="0.5" value={selectedItem.rayWidth ?? 1.5} onChange={(e) => updateItemProp('rayWidth', parseFloat(e.target.value))} className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1">Line Style</label>
                  <select value={selectedItem.rayStyle || 'dashed'} onChange={(e) => updateItemProp('rayStyle', e.target.value)} className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}>
                     <option value="solid">Solid</option>
                     <option value="dashed">Dashed</option>
                     <option value="dotted">Dotted</option>
                  </select>
                </div>
                <div className="col-span-2 mt-1 flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                    <input type="checkbox" checked={selectedItem.showArrow !== false} onChange={(e) => updateItemProp('showArrow', e.target.checked)} className="w-4 h-4 rounded" />
                    Draw Directional Arrows
                  </label>
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                    <input type="checkbox" checked={selectedItem.animate !== false} onChange={(e) => updateItemProp('animate', e.target.checked)} className="w-4 h-4 rounded" />
                    Animate Ray Path
                  </label>
                </div>
              </div>
            </div>
          )}

          <button onClick={deleteSelected} className="w-full flex items-center justify-center gap-2 p-2 mt-2 bg-red-500 hover:bg-red-600 border border-red-700 text-white rounded-none transition-colors shadow-sm">
            <Trash2 size={14} />
            <span className="text-xs font-bold">Delete</span>
          </button>
        </div>
      </div>
    );
  };

  // --- VIEWPORT RENDERER ---
  const renderViewport = (viewType, title, refObj, scrollRef, planeCoord, tracePoints) => {
    const isPanning = draggingInfo?.type === 'pan' && draggingInfo?.view === viewType;

    return (
      <div className="flex-1 flex flex-col relative border-b-2 overflow-hidden" style={{ borderColor: theme.inactiveBorder, backgroundColor: theme.bg }}>
        <div className={`absolute top-4 left-4 z-20 backdrop-blur px-3 py-1.5 shadow-sm border flex items-center gap-2 rounded-none ${theme.badgeBg}`}>
          <Layers size={16} className={theme.text} />
          <span className={`font-bold text-sm tracking-wide ${theme.text}`}>{title}</span>
        </div>
        
        {/* Infinite Pan Container */}
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
          {/* Zoom and Pan Transform Wrapper */}
          <div 
            className="absolute inset-0"
            style={{
              transform: `translate(${pan[viewType].x}px, ${pan[viewType].y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {/* Infinite Background Grid */}
            <div style={{
              position: 'absolute',
              left: -48000, top: -48000, width: 96000, height: 96000,
              backgroundImage: showGrid ? theme.grid : 'none',
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
            }} />

            {/* SVG TRACING AND RULER LAYER */}
            <svg style={{ position: 'absolute', overflow: 'visible', zIndex: 0 }}>
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

              {/* Infinite Floor */}
              {viewType === 'SIDE' && (
                <g>
                  <line x1="-48000" y1="200" x2="48000" y2="200" stroke={theme.inactiveBorder} strokeWidth="2" />
                  <rect x="-48000" y="200" width="96000" height="12" fill={`url(#floor-hatch-${viewType})`} />
                </g>
              )}

              {/* RULER (Distance Scale) */}
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

            {/* DOM COMPONENT LAYER */}
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
                if (item.type === 'GRATING') {
                    if (isGratingActive) {
                        rotation = -(parseFloat(item.tiltAngle) ?? 45) * Math.PI / 180;
                    }
                } else if (isSimpleMirrorActive) {
                    const pIdx = tracePoints.findIndex(p => p.parentId === item.id && p.sub === 0);
                    if (pIdx > 0 && pIdx < tracePoints.length - 1) {
                        const p = tracePoints[pIdx];
                        const prev = tracePoints[pIdx - 1];
                        const next = tracePoints[pIdx + 1];
                        const angleIn = Math.atan2(p[planeCoord] - prev[planeCoord], p.x - prev.x);
                        const angleOut = Math.atan2(next[planeCoord] - p[planeCoord], next.x - p.x);
                        rotation = (angleIn + angleOut) / 2;
                        if (angleIn < angleOut) rotation += Math.PI;
                    }
                }

                // Simple mirrors and gratings pivot on front edge for reflective physics
                let transformOrigin = isSimpleMirrorActive ? '50% 0%' : '50% 50%';
                let transformOffset = isSimpleMirrorActive ? 'translate(-50%, 0%)' : 'translate(-50%, -50%)';
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

                const zIndexClass = item.type === 'HUTCH' ? (isSelected ? 'z-[5]' : 'z-0') : (isSelected ? 'z-20' : 'z-10 hover:z-20');

                // Intelligent handle placement: Top-Right for SIDE view so it grows upward off the floor!
                const resizeHandlePos = viewType === 'SIDE' ? { right: '-6px', top: '-6px', cursor: 'nesw-resize' } : { right: '-6px', bottom: '-6px', cursor: 'nwse-resize' };

                return (
                  <div
                    key={item.id}
                    className={`absolute ${zIndexClass}`}
                    style={{
                      left: item.x,
                      top: item[planeCoord],
                      transition: isDraggingThis ? 'none' : 'left 0.1s ease-out, top 0.1s ease-out'
                    }}
                  >
                    {/* The Optical Component */}
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
                      {renderVisual(item, viewType, tracePoints)}
                      
                      {isSelected && ['WALL', 'HUTCH'].includes(item.type) && (
                        <div 
                          className="absolute w-3 h-3 bg-blue-500 border border-white z-[60]"
                          style={resizeHandlePos}
                          onPointerDown={(e) => handleResizePointerDown(e, item.id, viewType)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>

                    {/* The Independent Draggable/Editable Label */}
                    <div 
                      className={`absolute whitespace-nowrap text-[10px] font-bold px-1 py-0.5 pointer-events-auto transition-opacity ${isEditing ? 'z-30 cursor-text' : 'z-20 cursor-grab active:cursor-grabbing hover:text-blue-500'} ${placingType ? 'pointer-events-none' : ''}`}
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
                          className="bg-transparent border-b border-blue-500 outline-none text-center p-0 m-0 text-[10px] font-bold select-text"
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
                  </div>
                );
              })}

              {/* GHOST PLACEMENT LAYER */}
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
                 if (viewType === 'SIDE' && ['WALL', 'HUTCH'].includes(placingType)) {
                    ghostY = 200 - itemH / 2;
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
                     {renderVisual(mockItem, viewType, [])}
                   </div>
                 );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-screen w-full font-sans overflow-hidden select-none ${theme.bg}`}>
      
      {/* FLOATING GLOBAL TOOLBAR */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
         <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 border shadow-sm rounded-none transition-colors ${theme.buttonBg} ${theme.text}`}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
         </button>
         <button onClick={() => setShowUI(!showUI)} className={`p-2 border shadow-sm rounded-none transition-colors ${theme.buttonBg} ${theme.text}`}>
            {showUI ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
         </button>
      </div>

      {/* SIDEBAR PALETTE */}
      <div className={`${showUI ? 'w-72 border-r' : 'w-0 overflow-hidden'} flex flex-col z-30 transition-all duration-300 ${theme.panelBg} ${theme.panelBorder} shadow-xl`}>
        <div className="p-4 bg-blue-600 text-white flex items-center gap-2">
          <Settings2 size={20} />
          <h1 className="font-bold text-lg tracking-wide whitespace-nowrap">Beamline Builder</h1>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className={`mb-6 p-4 border shadow-sm rounded-none ${theme.inactiveBg} ${theme.inactiveBorder}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme.text}`}>Canvas Controls</p>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col mb-1">
                <label className={`text-[10px] font-bold uppercase mb-0.5 ${theme.text}`}>Load Template</label>
                <select 
                  onChange={(e) => loadTemplate(e.target.value)}
                  className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                  defaultValue=""
                >
                  <option value="" disabled>Select a preset...</option>
                  {Object.keys(templates).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button onClick={handleFitToScreen} className={`flex items-center justify-center gap-1 p-2 border rounded-none text-xs font-bold transition-colors ${theme.buttonBg} ${theme.text}`}>
                  <Maximize size={14} /> Fit to Screen
                </button>
                <button onClick={handleOpenJsonModal} className={`flex items-center justify-center gap-1 p-2 border rounded-none text-xs font-bold transition-colors ${theme.buttonBg} ${theme.text}`}>
                  <FileJson size={14} /> JSON Port
                </button>
              </div>
              <button onClick={handleClearAll} className="w-full flex items-center justify-center gap-1 p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-none text-xs font-bold transition-colors">
                <Trash2 size={14} /> Clear All
              </button>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button onClick={() => setShowGrid(!showGrid)} className={`flex items-center justify-center gap-1 p-2 border rounded-none text-xs font-bold transition-colors ${showGrid ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                  <Grid size={14} /> Grid
                </button>
                <button onClick={() => setSnapToGrid(!snapToGrid)} className={`flex items-center justify-center gap-1 p-2 border rounded-none text-xs font-bold transition-colors ${snapToGrid ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                  <Magnet size={14} /> Snap
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button onClick={() => setShowRuler(!showRuler)} className={`w-full flex items-center justify-center gap-1 p-2 border rounded-none text-xs font-bold transition-colors ${showRuler ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                  <Ruler size={14} /> Ruler
                </button>
                <div className="flex flex-col">
                  <label className={`text-[10px] font-bold uppercase mb-0.5 ${theme.text}`}>Len (m)</label>
                  <input
                    type="number"
                    value={canvasLength}
                    onChange={(e) => setCanvasLength(Math.max(1, Number(e.target.value)))}
                    className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button onClick={() => setActiveView('TOP')} className={`flex items-center justify-center p-2 border rounded-none text-xs font-bold transition-colors ${activeView === 'TOP' ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                  TOP
                </button>
                <button onClick={() => setActiveView('BOTH')} className={`flex items-center justify-center p-2 border rounded-none text-xs font-bold transition-colors ${activeView === 'BOTH' ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                  BOTH
                </button>
                <button onClick={() => setActiveView('SIDE')} className={`flex items-center justify-center p-2 border rounded-none text-xs font-bold transition-colors ${activeView === 'SIDE' ? 'bg-blue-600 text-white border-blue-700' : `${theme.buttonBg} ${theme.text}`}`}>
                  SIDE
                </button>
              </div>
            </div>
            <p className={`text-[10px] mt-3 opacity-60 text-center ${theme.text}`}>Tip: Use Mouse Wheel to Zoom</p>
          </div>

          <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme.text}`}>Add Optics</p>
          <div className="flex flex-col gap-2 mb-6">
            {['SOURCE', 'SLIT', 'FILTER', 'XBPM', 'GRATING', 'VDCM', 'HDCM', 'VFM', 'HFM', 'SAMPLE', 'SCREEN', 'DETECTOR'].map((key) => {
              const type = TYPES[key];
              return (
                <button key={type.id} onClick={() => addItem(type.id)} className={`flex items-center gap-3 p-3 border rounded-none transition-all text-left group ${placingType === type.id ? 'bg-blue-50 border-blue-400' : theme.buttonBg}`}>
                  <Plus size={16} className="text-blue-500" />
                  <span className={`text-sm font-bold ${theme.text}`}>{type.name}</span>
                </button>
              );
            })}
          </div>

          <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme.text}`}>Add Construction</p>
          <div className="flex flex-col gap-2 mb-6">
            {['WALL', 'HUTCH'].map((key) => {
              const type = TYPES[key];
              return (
                <button key={type.id} onClick={() => addItem(type.id)} className={`flex items-center gap-3 p-3 border rounded-none transition-all text-left group ${placingType === type.id ? 'bg-blue-50 border-blue-400' : theme.buttonBg}`}>
                  <Plus size={16} className="text-blue-500" />
                  <span className={`text-sm font-bold ${theme.text}`}>{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DUAL VIEWPORT AREA */}
      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: theme.canvasBg }}>
        {activeView !== 'SIDE' && renderViewport("TOP", "TOP", topViewRef, topScrollRef, "z", tracePointsTop)}
        {activeView !== 'TOP' && renderViewport("SIDE", "SIDE", sideViewRef, sideScrollRef, "y", tracePointsSide)}
      </div>

      {/* DRAGGABLE FLOATING PROPERTIES WIDGET */}
      {selectedItem && renderPropertiesWidget()}

      {/* JSON DATA PORTAL MODAL */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl flex flex-col shadow-2xl rounded-none border ${theme.panelBg} ${theme.panelBorder}`}>
            <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white">
              <div className="flex items-center gap-2">
                <FileJson size={18} />
                <h2 className="font-bold tracking-wide">JSON Data Portal</h2>
              </div>
              <button onClick={() => setIsJsonModalOpen(false)} className="text-white/80 hover:text-white font-bold">&times;</button>
            </div>

            <div className="p-4 flex flex-col gap-4">
              <p className={`text-xs font-bold ${theme.text} opacity-70 uppercase tracking-tight`}>
                Edit the JSON below to update the canvas, or copy it to save your layout.
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className={`w-full h-96 p-4 font-mono text-xs font-bold border rounded-none outline-none resize-none custom-scrollbar ${isDarkMode ? 'bg-slate-950 border-slate-700 text-blue-400' : 'bg-gray-50 border-gray-200 text-blue-600'}`}
                spellCheck="false"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setIsJsonModalOpen(false)}
                  className={`px-4 py-2 text-xs font-bold border rounded-none transition-colors ${theme.buttonBg} ${theme.text}`}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleApplyJson}
                  className="px-6 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-none transition-all shadow-md active:scale-95"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      );
      }