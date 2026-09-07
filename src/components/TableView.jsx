import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Table, Plus, Trash2, Copy, FileDown, Maximize2, Minimize2, X, 
  AlertTriangle, CheckCircle2, Search, ArrowRight, Layers, Eye,
  Sparkles, Check, ChevronDown, ChevronUp, Sliders, Box, GripHorizontal,
  Lock, Crosshair
} from 'lucide-react';
import { TYPES, PX_PER_M } from '../constants';
import { computeConstructionSchedule, downloadCsv, getItemBoundsM, calculateUpdatedBounds } from '../utils/constructionUtils';

export const TableView = ({
  items = [],
  setItems,
  selectedId,
  setSelectedId,
  canvasLength = 50,
  theme,
  isDarkMode,
  onClose,
  viewMode = 'split',        // 'split' (docked bottom) or 'full' (fullscreen table)
  setViewMode,
  onOpenCadExport
}) => {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'OPTICAL', 'ENCLOSURE'
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCompType, setNewCompType] = useState('SLIT');
  const [newCompDist, setNewCompDist] = useState(10);
  const [newCompLength, setNewCompLength] = useState(0.5);
  const [newCompName, setNewCompName] = useState('');

  // Boundary constraint mode: 'ADJUST_LENGTH' (default) | 'LOCK_LENGTH' | 'LOCK_CENTER'
  const [boundaryConstraint, setBoundaryConstraint] = useState('ADJUST_LENGTH');

  // Draggable table height state
  const [tableHeight, setTableHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('beamline_table_height');
      if (saved) return Math.max(160, Math.min(window.innerHeight - 100, parseInt(saved, 10)));
    } catch (e) {}
    return 360;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartH = useRef(0);

  // Compute live schedule with spatial clearances and overlap detection
  const scheduleData = useMemo(() => {
    return computeConstructionSchedule(items, canvasLength);
  }, [items, canvasLength]);

  // Master footprint box toggle state
  const allFootprintsVisible = useMemo(() => {
    const optical = scheduleData.opticalRows;
    return optical.length > 0 && optical.every(r => Boolean(r.item.showFootprint));
  }, [scheduleData]);

  const handleToggleAllFootprints = () => {
    const nextVal = !allFootprintsVisible;
    setItems(prev => prev.map(item => {
      if (['WALL', 'HUTCH', 'CHAMBER'].includes(item.type)) return item;
      return { ...item, showFootprint: nextVal };
    }));
  };

  // Drag-to-resize pointer handlers
  const handleResizePointerDown = (e) => {
    // If clicking on an interactive element, do not start drag
    const interactive = e.target.closest('button, input, select, textarea, a');
    if (interactive) return;

    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartH.current = tableHeight;
  };

  useEffect(() => {
    if (!isResizing) return;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    const handlePointerMove = (e) => {
      const delta = resizeStartY.current - e.clientY;
      const minH = 160;
      const maxH = window.innerHeight - 80;
      const newH = Math.max(minH, Math.min(maxH, resizeStartH.current + delta));
      setTableHeight(newH);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, tableHeight]);

  useEffect(() => {
    try {
      localStorage.setItem('beamline_table_height', tableHeight.toString());
    } catch (e) {}
  }, [tableHeight]);

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    return scheduleData.rows.filter(row => {
      if (filterType === 'OPTICAL' && !row.isOptical) return false;
      if (filterType === 'ENCLOSURE' && !row.isEnclosure) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (row.name || '').toLowerCase().includes(q);
        const matchesType = (row.type || '').toLowerCase().includes(q);
        const matchesEnc = (row.enclosureName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesEnc) return false;
      }
      return true;
    });
  }, [scheduleData, filterType, searchQuery]);

  // Update a property directly on an item
  const handleCellChange = (itemId, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;

      if (['start', 'end', 'distance', 'length'].includes(field)) {
        return calculateUpdatedBounds(item, field, value, boundaryConstraint);
      }

      const updated = { ...item };
      if (field === 'customName') {
        updated.customName = value;
      } else if (field === 'lockLength') {
        updated.lockLength = Boolean(value);
        if (value) updated.lockCenter = false;
      } else if (field === 'lockCenter') {
        updated.lockCenter = Boolean(value);
        if (value) updated.lockLength = false;
      } else if (field === 'showFootprint') {
        updated.showFootprint = value;
      } else if (field === 'height') {
        const h = parseFloat(value) || 0;
        updated.height = h;
        updated.y = 150 - h * PX_PER_M;
      } else if (field === 'offset') {
        const o = parseFloat(value) || 0;
        updated.offset = o;
        updated.z = 150 + o * PX_PER_M;
      } else if (field === 'type') {
        updated.type = value;
        const conf = TYPES[value];
        if (conf) {
          if (!updated.customName) updated.customName = conf.name;
          if (conf.defaultLength) {
            updated.length = conf.defaultLength;
          }
        }
      }
      return updated;
    }));
  };

  // Quick duplicate component
  const handleDuplicate = (row) => {
    const orig = row.item;
    const newDist = parseFloat((row.dist + 1.0).toFixed(2));
    const newItem = {
      ...orig,
      id: Date.now(),
      customName: `${orig.customName || orig.type} (Copy)`,
      distance: newDist,
      x: 160 + newDist * PX_PER_M
    };
    if (['WALL', 'HUTCH', 'CHAMBER'].includes(orig.type)) {
      const len = row.length;
      newItem.start = parseFloat((newDist - len / 2).toFixed(2));
      newItem.end = parseFloat((newDist + len / 2).toFixed(2));
    }
    setItems(prev => [...prev, newItem].sort((a, b) => (a.distance || 0) - (b.distance || 0)));
    setSelectedId(newItem.id);
  };

  // Delete component
  const handleDelete = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Add new component
  const handleAddNew = (e) => {
    e.preventDefault();
    const conf = TYPES[newCompType] || TYPES.SLIT;
    const len = parseFloat(newCompLength) || conf.defaultLength || (conf.width / PX_PER_M);
    const dist = parseFloat(newCompDist) || 10;
    const isRange = ['WALL', 'HUTCH', 'CHAMBER'].includes(newCompType);

    const newItem = {
      id: Date.now(),
      type: newCompType,
      customName: newCompName.trim() || conf.name,
      distance: dist,
      x: 160 + dist * PX_PER_M,
      y: 150,
      z: 150,
      height: 0,
      offset: 0,
      length: len,
      dimX: isRange ? (len * PX_PER_M) : conf.width,
      showLabel: true,
      showFootprint: true,
      ...(isRange ? {
        start: parseFloat((dist - len / 2).toFixed(2)),
        end: parseFloat((dist + len / 2).toFixed(2)),
        height: conf.height / PX_PER_M,
        dimY: conf.height,
        dimZ: conf.height
      } : {})
    };

    setItems(prev => [...prev, newItem].sort((a, b) => (a.distance || 0) - (b.distance || 0)));
    setSelectedId(newItem.id);
    setIsAddingNew(false);
    setNewCompName('');
  };

  // Auto sort all items by beamline distance
  const handleSortByPosition = () => {
    setItems(prev => [...prev].sort((a, b) => {
      const bA = getItemBoundsM(a);
      const bB = getItemBoundsM(b);
      return bA.start - bB.start || bA.dist - bB.dist;
    }));
  };

  return (
    <div 
      className={`flex flex-col border-t shadow-2xl select-none relative ${
        viewMode === 'full' 
          ? 'fixed inset-0 z-50' 
          : 'w-full z-30 transition-[height]'
      } ${isResizing ? 'transition-none' : ''} ${theme.panelBg} ${theme.panelBorder}`}
      style={viewMode === 'full' ? {} : { height: `${tableHeight}px` }}
    >
      {/* DRAGGABLE TOP SPLITTER / RESIZE BAR */}
      {viewMode !== 'full' && (
        <div
          onPointerDown={handleResizePointerDown}
          onDoubleClick={() => setTableHeight(prev => prev > 450 ? 320 : 540)}
          className={`h-3.5 w-full cursor-ns-resize flex items-center justify-center transition-colors group select-none z-20 touch-none ${
            isResizing 
              ? 'bg-blue-600 shadow-md' 
              : (isDarkMode ? 'bg-slate-800 hover:bg-blue-600/70' : 'bg-slate-300 hover:bg-blue-500/70')
          }`}
          title="Click and drag up/down to expand table height (Double-click to toggle size)"
        >
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-400/80 dark:bg-slate-600/80 group-hover:bg-white group-hover:text-blue-600 transition-all">
            <GripHorizontal size={14} className="opacity-80 group-hover:opacity-100" />
            <span className="text-[9px] font-bold uppercase tracking-wider hidden group-hover:inline">Drag to Resize</span>
          </div>
        </div>
      )}

      {/* TOP HEADER & DASHBOARD BAR (DRAGGABLE TO EXPAND GUI) */}
      <div 
        onPointerDown={handleResizePointerDown}
        onDoubleClick={(e) => {
          if (!e.target.closest('button, input, select, textarea, a')) {
            setTableHeight(prev => prev > 450 ? 320 : 540);
          }
        }}
        className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 select-none ${
          viewMode !== 'full' ? 'cursor-ns-resize' : ''
        } ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-300'
        }`}
        title={viewMode !== 'full' ? "Drag this headline up/down to expand table GUI (Double-click to toggle size)" : ""}
      >
        {/* Title & Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded">
              <Table size={16} />
            </div>
            <div>
              <h2 className={`font-bold text-xs uppercase tracking-wider ${theme.text}`}>
                Construction Schedule & Spatial Clearance Guide
              </h2>
              <p className="text-[10px] opacity-70">
                Detailed coordinate schedule, physical lengths, and free inter-component gaps for civil/mechanical installation.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold">
            <span className={`px-2 py-0.5 border rounded ${theme.badgeBg} ${theme.text}`} title="Total beamline length">
              📏 {canvasLength} m Total
            </span>
            <span className={`px-2 py-0.5 border rounded ${theme.badgeBg} ${theme.text}`} title="Total optical element footprint">
              🔍 {scheduleData.opticalCount} Optical ({scheduleData.totalOpticalLength} m)
            </span>
            <span className={`px-2 py-0.5 border rounded ${theme.badgeBg} text-emerald-600 dark:text-emerald-400`} title="Clear space available for transport, vacuum flanging, and stands">
              ✨ {scheduleData.freeBeamlineSpace} m Free ({100 - scheduleData.spaceUtilization}%)
            </span>

            {/* Overlap / Collision Alert Badge */}
            {scheduleData.hasOverlaps ? (
              <span className="px-2 py-0.5 border border-red-500 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded flex items-center gap-1 animate-pulse">
                <AlertTriangle size={12} />
                <span>{scheduleData.overlaps.length} SPATIAL COLLISION(S)</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>All Clearances OK</span>
              </span>
            )}
          </div>
        </div>

        {/* Toolbar Action Controls */}
        <div className="flex items-center gap-2">
          {/* Add Component Button */}
          <button
            onClick={() => setIsAddingNew(!isAddingNew)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded transition-all shadow-sm ${
              isAddingNew 
                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus size={14} />
            <span>{isAddingNew ? 'Cancel Add' : 'Add Component'}</span>
          </button>

          {/* CAD SVG Export Button */}
          <button
            onClick={onOpenCadExport}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border rounded transition-colors ${theme.buttonBg} ${theme.text} hover:border-blue-500 hover:text-blue-500`}
            title="Export vector SVG formatted for CAD design (AutoCAD, FreeCAD, SolidWorks)"
          >
            <Sparkles size={14} className="text-blue-500" />
            <span>Export CAD (SVG)</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={() => downloadCsv(scheduleData, 'beamline_construction_schedule.csv')}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-all shadow-sm"
            title="Download full CSV spreadsheet for Excel / construction team"
          >
            <FileDown size={14} />
            <span>Export Table to CSV</span>
          </button>

          {/* View Mode Toggle: Split / Full */}
          {setViewMode && (
            <button
              onClick={() => setViewMode(viewMode === 'full' ? 'split' : 'full')}
              className={`p-1.5 border rounded transition-colors ${theme.buttonBg} ${theme.text}`}
              title={viewMode === 'full' ? 'Restore Split View' : 'Maximize Table'}
            >
              {viewMode === 'full' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}

          {/* Close Panel Button */}
          {onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 border rounded transition-colors hover:text-red-500 ${theme.buttonBg} ${theme.text}`}
              title="Close Table Schedule"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className={`px-3 py-2 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
        isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-bold opacity-60 uppercase text-[10px]">Filter:</span>
          <div className="flex border rounded overflow-hidden">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-0.5 text-xs font-bold transition-colors ${
                filterType === 'ALL' 
                  ? 'bg-blue-600 text-white' 
                  : `${theme.buttonBg} ${theme.text}`
              }`}
            >
              All ({scheduleData.totalCount})
            </button>
            <button
              onClick={() => setFilterType('OPTICAL')}
              className={`px-2.5 py-0.5 text-xs font-bold border-l transition-colors ${
                filterType === 'OPTICAL' 
                  ? 'bg-blue-600 text-white' 
                  : `${theme.buttonBg} ${theme.text}`
              }`}
            >
              Optical Only ({scheduleData.opticalCount})
            </button>
            <button
              onClick={() => setFilterType('ENCLOSURE')}
              className={`px-2.5 py-0.5 text-xs font-bold border-l transition-colors ${
                filterType === 'ENCLOSURE' 
                  ? 'bg-blue-600 text-white' 
                  : `${theme.buttonBg} ${theme.text}`
              }`}
            >
              Enclosures ({scheduleData.enclosureCount})
            </button>
          </div>

          <button
            onClick={handleSortByPosition}
            className={`px-2 py-0.5 text-xs font-bold border rounded transition-colors ${theme.buttonBg} ${theme.text}`}
            title="Re-sort list strictly along downstream beamline coordinate"
          >
            Sort Downstream
          </button>

          {/* BOUNDARY EDIT MODE CONTROLS */}
          <div className="flex items-center gap-1.5 border-l pl-3 border-slate-300 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase opacity-60">
              X₁/X₂ Mode:
            </span>
            <div className="flex border rounded overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setBoundaryConstraint('ADJUST_LENGTH')}
                className={`px-2 py-0.5 text-[11px] font-bold transition-colors flex items-center gap-1 ${
                  boundaryConstraint === 'ADJUST_LENGTH'
                    ? 'bg-blue-600 text-white'
                    : `${theme.buttonBg} ${theme.text}`
                }`}
                title="Editing Upstream X₁ or Downstream X₂ dynamically adjusts length (opposite face stays anchored)"
              >
                <span>↔ Adjust Length</span>
              </button>
              <button
                type="button"
                onClick={() => setBoundaryConstraint('LOCK_LENGTH')}
                className={`px-2 py-0.5 text-[11px] font-bold border-l transition-colors flex items-center gap-1 ${
                  boundaryConstraint === 'LOCK_LENGTH'
                    ? 'bg-blue-600 text-white'
                    : `${theme.buttonBg} ${theme.text}`
                }`}
                title="Editing Upstream X₁ or Downstream X₂ shifts the component along the beamline, keeping length locked"
              >
                <Lock size={11} />
                <span>Lock Length</span>
              </button>
              <button
                type="button"
                onClick={() => setBoundaryConstraint('LOCK_CENTER')}
                className={`px-2 py-0.5 text-[11px] font-bold border-l transition-colors flex items-center gap-1 ${
                  boundaryConstraint === 'LOCK_CENTER'
                    ? 'bg-blue-600 text-white'
                    : `${theme.buttonBg} ${theme.text}`
                }`}
                title="Editing Upstream X₁ or Downstream X₂ resizes symmetrically around the locked Center position"
              >
                <Crosshair size={11} />
                <span>Lock Center</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              type="text"
              placeholder="Search component, type, or hutch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-8 pr-2.5 py-1 text-xs border rounded outline-none w-56 font-bold ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-900'
              }`}
            />
          </div>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-blue-500 font-bold">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* QUICK INLINE "ADD COMPONENT" FORM (IF TOGGLED) */}
      {isAddingNew && (
        <form onSubmit={handleAddNew} className={`p-3 border-b flex flex-wrap items-center gap-3 ${
          isDarkMode ? 'bg-blue-950/30 border-blue-800/60' : 'bg-blue-50/70 border-blue-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold uppercase opacity-70">Type:</label>
            <select
              value={newCompType}
              onChange={(e) => {
                setNewCompType(e.target.value);
                const conf = TYPES[e.target.value];
                if (conf?.defaultLength) setNewCompLength(conf.defaultLength);
                else if (conf?.width) setNewCompLength(parseFloat((conf.width / PX_PER_M).toFixed(3)));
              }}
              className={`p-1 text-xs font-bold border rounded outline-none ${theme.buttonBg} ${theme.text}`}
            >
              {Object.keys(TYPES).map(t => (
                <option key={t} value={t}>{TYPES[t].name} ({t})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold uppercase opacity-70">Name/Tag:</label>
            <input
              type="text"
              placeholder="e.g. Filter Stage 1"
              value={newCompName}
              onChange={(e) => setNewCompName(e.target.value)}
              className={`p-1 text-xs font-bold border rounded outline-none w-36 ${theme.buttonBg} ${theme.text}`}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold uppercase opacity-70">Position X (m):</label>
            <input
              type="number"
              step="0.05"
              value={newCompDist}
              onChange={(e) => setNewCompDist(e.target.value)}
              className={`p-1 text-xs font-bold border rounded outline-none w-20 text-center ${theme.buttonBg} ${theme.text}`}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold uppercase opacity-70">Length (m):</label>
            <input
              type="number"
              step="0.05"
              value={newCompLength}
              onChange={(e) => setNewCompLength(e.target.value)}
              className={`p-1 text-xs font-bold border rounded outline-none w-20 text-center ${theme.buttonBg} ${theme.text}`}
            />
          </div>

          <button
            type="submit"
            className="px-4 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded transition-all shadow-sm"
          >
            Insert Component
          </button>
        </form>
      )}

      {/* SCHEDULE DATA TABLE */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead className={`sticky top-0 z-10 text-[10px] font-bold uppercase tracking-wider border-b select-none ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-200/90 border-slate-300 text-slate-700'
          }`}>
            <tr>
              <th className="py-2 px-2 text-center w-10">#</th>
              {/* Footprint Box master toggle column */}
              <th className="py-2 px-2 text-center w-14" title="Toggle dashed footprint envelope on canvas">
                <div className="flex items-center justify-center gap-1">
                  <input 
                    type="checkbox"
                    checked={allFootprintsVisible}
                    onChange={handleToggleAllFootprints}
                    className="w-3.5 h-3.5 rounded cursor-pointer text-blue-600"
                    title="Toggle dashed footprint box on all components"
                  />
                  <span>Box</span>
                </div>
              </th>
              <th className="py-2 px-3">Component Type</th>
              <th className="py-2 px-3">Tag / Name</th>
              <th className="py-2 px-3 text-right" title="Component centerline beamline coordinate">
                <span>Center X (m)</span>
                {boundaryConstraint === 'LOCK_CENTER' && <span className="text-purple-500 font-bold ml-1" title="Lock Center mode active">🎯</span>}
              </th>
              <th className="py-2 px-3 text-right" title="Equipment physical length envelope">
                <span>Physical Length (m)</span>
                {boundaryConstraint === 'LOCK_LENGTH' && <span className="text-blue-500 font-bold ml-1" title="Lock Length mode active">🔒</span>}
              </th>
              <th className="py-2 px-3 text-right bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black" title="Upstream entrance face coordinate (Directly editable)">
                <span>Upstream X₁ (m) ✎</span>
              </th>
              <th className="py-2 px-3 text-right bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black" title="Downstream exit face coordinate (Directly editable)">
                <span>Downstream X₂ (m) ✎</span>
              </th>
              <th className="py-2 px-3 text-center bg-blue-500/10 font-black">
                Clearance to Next (ΔX)
              </th>
              <th className="py-2 px-3 text-right">Elevation Y (m)</th>
              <th className="py-2 px-3 text-right">Offset Z (m)</th>
              <th className="py-2 px-3">Enclosure / Station</th>
              <th className="py-2 px-3 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan="13" className="py-8 text-center opacity-60 font-bold">
                  No components match the current filter or search criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isSelected = selectedId === row.id;

                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? (isDarkMode ? 'bg-blue-950/60 font-bold' : 'bg-blue-100/70 font-bold')
                        : (isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50')
                    }`}
                  >
                    {/* Index */}
                    <td className="py-2 px-2 text-center font-mono opacity-60">
                      {row.index}
                    </td>

                    {/* Footprint Box Checkbox Toggle */}
                    <td className="py-2 px-2 text-center">
                      {!['WALL', 'HUTCH', 'CHAMBER'].includes(row.type) ? (
                        <input 
                          type="checkbox" 
                          checked={Boolean(row.item.showFootprint)} 
                          onClick={(e) => e.stopPropagation()} 
                          onChange={(e) => handleCellChange(row.id, 'showFootprint', e.target.checked)} 
                          className="w-3.5 h-3.5 rounded cursor-pointer text-blue-600" 
                          title={Boolean(row.item.showFootprint) ? "Hide dashed footprint box on canvas" : "Show dashed footprint box on canvas"} 
                        />
                      ) : (
                        <span className="text-[9px] opacity-30 font-mono">-</span>
                      )}
                    </td>

                    {/* Component Type Dropdown */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <select
                        value={row.type}
                        onChange={(e) => handleCellChange(row.id, 'type', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`font-bold text-[11px] py-0.5 px-1.5 border rounded outline-none ${
                          row.isEnclosure
                            ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {Object.keys(TYPES).map(t => (
                          <option key={t} value={t}>{TYPES[t].name} ({t})</option>
                        ))}
                      </select>
                    </td>

                    {/* Component Name / Tag Input */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCellChange(row.id, 'customName', e.target.value)}
                        className={`w-full py-0.5 px-1.5 font-bold border rounded outline-none transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-white dark:bg-slate-900'
                            : 'border-transparent hover:border-gray-400/40 bg-transparent'
                        } ${theme.text}`}
                      />
                    </td>

                    {/* Center Distance X (m) Input */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          step="0.05"
                          value={row.dist}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleCellChange(row.id, 'distance', e.target.value)}
                          className={`w-20 text-right py-0.5 px-1.5 font-mono font-bold border rounded outline-none ${
                            isSelected ? 'border-blue-500 bg-white dark:bg-slate-900' : 'border-transparent hover:border-gray-400/40 bg-transparent'
                          } ${theme.text}`}
                          title="Component centerline coordinate along beam axis"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellChange(row.id, 'lockCenter', !row.item.lockCenter);
                          }}
                          className={`p-0.5 rounded transition-colors ${
                            row.item.lockCenter
                              ? 'text-purple-500 font-bold bg-purple-500/15'
                              : 'opacity-25 hover:opacity-100 hover:text-purple-500'
                          }`}
                          title={row.item.lockCenter ? "Center position locked (click to unlock)" : "Lock center position for this item"}
                        >
                          <Crosshair size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Physical Length L (m) Input */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          step="0.05"
                          min="0.01"
                          value={row.length}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleCellChange(row.id, 'length', e.target.value)}
                          className={`w-20 text-right py-0.5 px-1.5 font-mono font-bold border rounded outline-none ${
                            isSelected ? 'border-blue-500 bg-white dark:bg-slate-900' : 'border-transparent hover:border-gray-400/40 bg-transparent'
                          } ${theme.text}`}
                          title="Physical equipment length (controls clearance gap and dashed envelope)"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellChange(row.id, 'lockLength', !row.item.lockLength);
                          }}
                          className={`p-0.5 rounded transition-colors ${
                            row.item.lockLength
                              ? 'text-blue-500 font-bold bg-blue-500/15'
                              : 'opacity-25 hover:opacity-100 hover:text-blue-500'
                          }`}
                          title={row.item.lockLength ? "Physical length locked (click to unlock)" : "Lock physical length for this item"}
                        >
                          <Lock size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Upstream Face X_start (m) Editable Input */}
                    <td className="py-2 px-3 text-right whitespace-nowrap bg-blue-500/5 dark:bg-blue-500/5">
                      <input
                        type="number"
                        step="0.05"
                        value={row.start}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCellChange(row.id, 'start', e.target.value)}
                        className={`w-20 text-right py-0.5 px-1.5 font-mono font-bold border rounded outline-none ${
                          isSelected ? 'border-blue-500 bg-white dark:bg-slate-900' : 'border-transparent hover:border-gray-400/40 bg-transparent'
                        } ${theme.text}`}
                        title="Upstream entrance face coordinate (X₁ in meters) - Directly editable!"
                      />
                    </td>

                    {/* Downstream Face X_end (m) Editable Input */}
                    <td className="py-2 px-3 text-right whitespace-nowrap bg-blue-500/5 dark:bg-blue-500/5">
                      <input
                        type="number"
                        step="0.05"
                        value={row.end}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCellChange(row.id, 'end', e.target.value)}
                        className={`w-20 text-right py-0.5 px-1.5 font-mono font-bold border rounded outline-none ${
                          isSelected ? 'border-blue-500 bg-white dark:bg-slate-900' : 'border-transparent hover:border-gray-400/40 bg-transparent'
                        } ${theme.text}`}
                        title="Downstream exit face coordinate (X₂ in meters) - Directly editable!"
                      />
                    </td>

                    {/* SPATIAL CLEARANCE TO NEXT COMPONENT */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {row.gapToNext === null ? (
                        <span className="text-[10px] opacity-40 font-mono">-</span>
                      ) : row.isOverlap ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono font-bold text-[11px] bg-red-500 text-white rounded shadow-sm animate-pulse" title={`Spatial overlap of ${row.overlapAmount} m with ${row.nextItemName}!`}>
                          <AlertTriangle size={12} />
                          <span>OVERLAP: -{row.overlapAmount.toFixed(3)} m</span>
                        </span>
                      ) : row.gapToNext === 0 ? (
                        <span className="inline-block px-2 py-0.5 font-mono font-bold text-[11px] bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded" title="Touching / adjacent to next item">
                          0.000 m (abutting)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono font-bold text-[11px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 rounded" title={`Clear space to ${row.nextItemName}`}>
                          <ArrowRight size={11} className="opacity-70" />
                          <span>+{row.gapToNext.toFixed(3)} m clear</span>
                        </span>
                      )}
                    </td>

                    {/* Elevation Height Y (m) Input */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.05"
                        value={row.height}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCellChange(row.id, 'height', e.target.value)}
                        className="w-16 text-right py-0.5 px-1 font-mono font-bold border border-transparent hover:border-gray-400/40 bg-transparent rounded outline-none"
                      />
                    </td>

                    {/* Lateral Offset Z (m) Input */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.05"
                        value={row.offset}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleCellChange(row.id, 'offset', e.target.value)}
                        className="w-16 text-right py-0.5 px-1 font-mono font-bold border border-transparent hover:border-gray-400/40 bg-transparent rounded outline-none"
                      />
                    </td>

                    {/* Enclosure / Section */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        row.enclosureName === 'Open Beamline'
                          ? 'opacity-60 border-transparent'
                          : 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                      }`}>
                        {row.enclosureName}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(row.id);
                          }}
                          className={`p-1 border rounded transition-colors ${
                            isSelected ? 'bg-blue-600 text-white' : `${theme.buttonBg} ${theme.text}`
                          }`}
                          title="Highlight on 2D Canvas"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(row);
                          }}
                          className={`p-1 border rounded transition-colors hover:text-blue-500 ${theme.buttonBg} ${theme.text}`}
                          title="Duplicate Component"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(row.id);
                          }}
                          className="p-1 border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                          title="Delete Component"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BOTTOM FOOTER SUMMARY BAR */}
      <div className={`p-2.5 px-4 border-t flex flex-wrap items-center justify-between gap-4 text-xs ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
      }`}>
        <div className="flex items-center gap-3">
          <span>Displaying <strong>{filteredRows.length}</strong> of <strong>{scheduleData.totalCount}</strong> components</span>
          <span>•</span>
          <span>Total Footprint: <strong>{scheduleData.totalOpticalLength} m</strong></span>
          <span>•</span>
          <span>Free Space: <strong>{scheduleData.freeBeamlineSpace} m</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px]">
            Coordinate System: Origin (X=0) at Source center • +X Downstream • +Y Vertical • +Z Outboard
          </span>
        </div>
      </div>
    </div>
  );
};
